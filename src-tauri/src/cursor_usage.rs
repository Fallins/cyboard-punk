use crate::models::{ProviderSnapshot, UsageSample};
use base64::{
    engine::general_purpose::{URL_SAFE, URL_SAFE_NO_PAD},
    Engine as _,
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, UNIX_EPOCH};

const CURSOR_USAGE_EVENTS_URL: &str = "https://cursor.com/api/dashboard/get-filtered-usage-events";
const CURSOR_USAGE_WINDOW_DAYS: i64 = 7;
const PAGE_SIZE: usize = 500;
const MAX_PAGES: usize = 2;
const MAX_USAGE_SAMPLES: usize = 1_000;
const NETWORK_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UsageEventsResponse {
    #[serde(default)]
    usage_events_display: Vec<CursorUsageEvent>,
}

#[derive(Debug, Deserialize)]
struct CursorUsageEvent {
    #[serde(default)]
    timestamp: Option<Value>,
    #[serde(default)]
    model: Option<String>,
    #[serde(default, rename = "tokenUsage")]
    token_usage: Option<CursorTokenUsage>,
}

#[derive(Debug, Deserialize)]
struct CursorTokenUsage {
    #[serde(default, rename = "inputTokens")]
    input_tokens: Option<u64>,
    #[serde(default, rename = "outputTokens")]
    output_tokens: Option<u64>,
    #[serde(default, rename = "cacheWriteTokens")]
    cache_write_tokens: Option<u64>,
    #[serde(default, rename = "cacheReadTokens")]
    cache_read_tokens: Option<u64>,
    #[serde(default, rename = "totalCents")]
    total_cents: Option<f64>,
}

pub fn attach(snapshots: &mut [ProviderSnapshot]) {
    let Some(snapshot) = snapshots
        .iter_mut()
        .find(|snapshot| snapshot.provider == "cursor")
    else {
        return;
    };

    let Some(state) = cursor_state_db() else {
        return;
    };
    let Some(access_token) = sqlite_value(&state, "cursorAuth/accessToken") else {
        return;
    };
    let Some(cookie) = cursor_cookie(&access_token) else {
        return;
    };

    let Ok(usage) = fetch_recent_usage(&cookie) else {
        return;
    };
    if usage.is_empty() {
        return;
    }

    snapshot.usage = usage;
    snapshot.capabilities.push("usage".into());
    snapshot.capabilities.sort();
    snapshot.capabilities.dedup();
}

fn modified_sort_key(path: &PathBuf) -> u128 {
    std::fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

fn cursor_state_db() -> Option<PathBuf> {
    let home = std::env::var_os("HOME").map(PathBuf::from)?;
    [
        home.join("Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor Nightly/User/globalStorage/state.vscdb"),
    ]
    .into_iter()
    .filter(|path| path.is_file())
    .max_by_key(modified_sort_key)
}

fn sqlite_value(path: &PathBuf, key: &str) -> Option<String> {
    let query = format!(
        "SELECT value FROM ItemTable WHERE key='{}' LIMIT 1;",
        key.replace('\'', "''")
    );
    let output = Command::new("/usr/bin/sqlite3")
        .args(["-readonly", "-batch", "-noheader"])
        .arg(path)
        .arg(query)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8(output.stdout).ok()?.trim().to_string();
    (!text.is_empty()).then_some(text)
}

fn cursor_cookie(access_token: &str) -> Option<String> {
    let payload = access_token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD
        .decode(payload)
        .or_else(|_| URL_SAFE.decode(payload))
        .ok()?;
    let payload = serde_json::from_slice::<Value>(&bytes).ok()?;
    let subject = payload.get("sub")?.as_str()?;
    let user_id = subject.rsplit('|').next()?.trim();
    if user_id.is_empty()
        || !user_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-'))
    {
        return None;
    }
    Some(format!("WorkosCursorSessionToken={user_id}%3A%3A{access_token}"))
}

fn fetch_recent_usage(cookie: &str) -> Result<Vec<UsageSample>, String> {
    let client = Client::builder()
        .timeout(NETWORK_TIMEOUT)
        .connect_timeout(Duration::from_secs(8))
        .build()
        .map_err(|error| error.to_string())?;
    let end = Utc::now();
    let start = end - ChronoDuration::days(CURSOR_USAGE_WINDOW_DAYS);
    let mut usage = Vec::new();

    for page in 1..=MAX_PAGES {
        let payload = json!({
            "startDate": start.timestamp_millis(),
            "endDate": end.timestamp_millis(),
            "page": page,
            "pageSize": PAGE_SIZE,
        });
        let response = client
            .post(CURSOR_USAGE_EVENTS_URL)
            .header("Content-Type", "application/json")
            .header("Cookie", cookie)
            .header("Origin", "https://cursor.com")
            .header("Referer", "https://cursor.com/settings")
            .header("User-Agent", "CYBOARD")
            .json(&payload)
            .send()
            .map_err(|error| error.to_string())?;
        if !response.status().is_success() {
            return Err(format!(
                "Cursor usage events returned HTTP {}",
                response.status().as_u16()
            ));
        }
        let payload = response
            .json::<UsageEventsResponse>()
            .map_err(|error| error.to_string())?;
        let batch_len = payload.usage_events_display.len();
        usage.extend(payload.usage_events_display.into_iter().filter_map(event_to_sample));
        if batch_len < PAGE_SIZE {
            break;
        }
    }

    usage.sort_by(|left, right| timestamp_sort_key(&right.at).cmp(&timestamp_sort_key(&left.at)));
    usage.truncate(MAX_USAGE_SAMPLES);
    Ok(usage)
}

fn event_to_sample(event: CursorUsageEvent) -> Option<UsageSample> {
    let token_usage = event.token_usage?;
    let input_tokens = token_usage.input_tokens.unwrap_or(0);
    let output_tokens = token_usage.output_tokens.unwrap_or(0);
    let cache_creation_input_tokens = token_usage.cache_write_tokens.unwrap_or(0);
    let cached_input_tokens = token_usage.cache_read_tokens.unwrap_or(0);
    let tokens = input_tokens
        .saturating_add(output_tokens)
        .saturating_add(cache_creation_input_tokens)
        .saturating_add(cached_input_tokens);
    if tokens == 0 {
        return None;
    }

    Some(UsageSample {
        at: normalize_timestamp(event.timestamp.as_ref()?)?,
        tokens: Some(tokens),
        input_tokens: Some(input_tokens),
        output_tokens: Some(output_tokens),
        cached_input_tokens: Some(cached_input_tokens),
        cache_creation_input_tokens: Some(cache_creation_input_tokens),
        cost_usd: token_usage
            .total_cents
            .filter(|cents| cents.is_finite() && *cents >= 0.0)
            .map(|cents| cents / 100.0),
        project: None,
        model: event.model.filter(|model| !model.trim().is_empty()),
        scope: Some("request".into()),
    })
}

fn normalize_timestamp(value: &Value) -> Option<String> {
    if let Some(raw) = value.as_i64() {
        return unix_timestamp_to_rfc3339(raw);
    }
    if let Some(raw) = value.as_u64().and_then(|raw| i64::try_from(raw).ok()) {
        return unix_timestamp_to_rfc3339(raw);
    }
    let raw = value.as_str()?.trim();
    if let Ok(timestamp) = raw.parse::<i64>() {
        return unix_timestamp_to_rfc3339(timestamp);
    }
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|timestamp| timestamp.with_timezone(&Utc).to_rfc3339())
}

fn unix_timestamp_to_rfc3339(raw: i64) -> Option<String> {
    let millis = if raw.unsigned_abs() < 10_000_000_000 {
        raw.checked_mul(1000)?
    } else {
        raw
    };
    DateTime::<Utc>::from_timestamp_millis(millis).map(|timestamp| timestamp.to_rfc3339())
}

fn timestamp_sort_key(raw: &str) -> i64 {
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|timestamp| timestamp.timestamp_millis())
        .unwrap_or(i64::MIN)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_app_token_becomes_dashboard_cookie() {
        let payload = URL_SAFE_NO_PAD.encode(b"{\"sub\":\"auth0|user-123\"}");
        let token = format!("header.{payload}.signature");
        let expected = format!("WorkosCursorSessionToken=user-123%3A%3A{token}");
        assert_eq!(cursor_cookie(&token).as_deref(), Some(expected.as_str()));
    }

    #[test]
    fn maps_cursor_event_token_breakdown_and_cost() {
        let event = CursorUsageEvent {
            timestamp: Some(Value::String("1788403200000".into())),
            model: Some("claude-4.7-sonnet".into()),
            token_usage: Some(CursorTokenUsage {
                input_tokens: Some(100),
                output_tokens: Some(20),
                cache_write_tokens: Some(30),
                cache_read_tokens: Some(400),
                total_cents: Some(2.5),
            }),
        };
        let sample = event_to_sample(event).expect("usage sample");
        assert_eq!(sample.tokens, Some(550));
        assert_eq!(sample.input_tokens, Some(100));
        assert_eq!(sample.output_tokens, Some(20));
        assert_eq!(sample.cache_creation_input_tokens, Some(30));
        assert_eq!(sample.cached_input_tokens, Some(400));
        assert_eq!(sample.cost_usd, Some(0.025));
        assert_eq!(sample.model.as_deref(), Some("claude-4.7-sonnet"));
        assert_eq!(sample.scope.as_deref(), Some("request"));
        assert!(sample.project.is_none());
    }

    #[test]
    fn accepts_rfc3339_and_unix_cursor_timestamps() {
        assert_eq!(
            normalize_timestamp(&Value::String("2026-09-03T08:15:30Z".into())).as_deref(),
            Some("2026-09-03T08:15:30+00:00")
        );
        assert!(normalize_timestamp(&Value::from(1_788_403_200_000_i64))
            .is_some_and(|timestamp| timestamp.starts_with("2026-")));
    }

    #[test]
    fn ignores_events_without_measured_tokens() {
        let event = CursorUsageEvent {
            timestamp: Some(Value::String("2026-09-03T08:15:30Z".into())),
            model: Some("auto".into()),
            token_usage: Some(CursorTokenUsage {
                input_tokens: Some(0),
                output_tokens: Some(0),
                cache_write_tokens: Some(0),
                cache_read_tokens: Some(0),
                total_cents: Some(1.0),
            }),
        };
        assert!(event_to_sample(event).is_none());
    }
}
