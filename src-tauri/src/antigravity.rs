use crate::models::{ProviderIssue, ProviderSnapshot, QuotaWindow};
use chrono::Utc;
use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, CONTENT_TYPE, USER_AGENT};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

const QUOTA_SUMMARY_PATH: &str = "/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary";
const TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Clone, PartialEq, Eq)]
struct LocalEndpoint {
    port: u16,
    csrf_token: String,
}

pub fn collect() -> ProviderSnapshot {
    let Some(endpoint) = discover_local_endpoint() else {
        let installed = antigravity_installed();
        return ProviderSnapshot::unavailable(
            "antigravity",
            "Antigravity",
            if installed { "login-required" } else { "not-installed" },
            if installed {
                "Start Antigravity (or agy) and refresh so CYBOARD can read the local quota service"
            } else {
                "Antigravity app or agy CLI was not found"
            },
        );
    };

    match fetch_quota_summary(&endpoint) {
        Ok(quota) if !quota.is_empty() => {
            let mut snapshot = base_snapshot();
            snapshot.quota = quota;
            snapshot.capabilities.push("quota".into());
            snapshot
        }
        Ok(_) => unavailable("schema-changed", "Antigravity returned no recognized quota buckets"),
        Err(message) => unavailable("network", message),
    }
}

fn base_snapshot() -> ProviderSnapshot {
    ProviderSnapshot {
        provider: "antigravity".into(),
        display_name: "Antigravity".into(),
        capabilities: Vec::new(),
        quota: Vec::new(),
        quota_history: Vec::new(),
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "fresh".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: None,
    }
}

fn unavailable(code: &str, message: impl Into<String>) -> ProviderSnapshot {
    let mut snapshot = base_snapshot();
    snapshot.freshness = "unavailable".into();
    snapshot.issue = Some(ProviderIssue {
        code: code.into(),
        message: message.into(),
        retry_at: None,
    });
    snapshot
}

fn antigravity_installed() -> bool {
    which::which("agy").is_ok()
        || which::which("antigravity-cli").is_ok()
        || PathBuf::from("/Applications/Antigravity.app").exists()
        || PathBuf::from("/Applications/Gemini.app").exists()
}

fn discover_local_endpoint() -> Option<LocalEndpoint> {
    let output = Command::new("/bin/ps")
        .args(["-axo", "pid=,command="])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    text.lines().find_map(parse_process_line)
}

fn parse_process_line(line: &str) -> Option<LocalEndpoint> {
    let command = line.trim();
    let lower = command.to_lowercase();
    let language_server = lower.contains("language_server") || lower.contains("language-server");
    let antigravity = lower.contains("antigravity") || lower.contains("/gemini.app/");
    if !language_server || !antigravity {
        return None;
    }

    let port = extract_flag(command, "--extension_server_port")?.parse::<u16>().ok()?;
    let csrf_token = extract_flag(command, "--extension_server_csrf_token")
        .or_else(|| extract_flag(command, "--csrf_token"))?;
    Some(LocalEndpoint { port, csrf_token })
}

fn extract_flag(command: &str, flag: &str) -> Option<String> {
    let parts = command.split_whitespace().collect::<Vec<_>>();
    for (index, part) in parts.iter().enumerate() {
        if let Some(value) = part.strip_prefix(&format!("{flag}=")) {
            return (!value.is_empty()).then(|| value.to_string());
        }
        if *part == flag {
            return parts
                .get(index + 1)
                .map(|value| value.trim_matches(['\'', '"']).to_string())
                .filter(|value| !value.is_empty());
        }
    }
    None
}

fn fetch_quota_summary(endpoint: &LocalEndpoint) -> Result<Vec<QuotaWindow>, String> {
    let client = Client::builder()
        .timeout(TIMEOUT)
        .connect_timeout(Duration::from_secs(3))
        .build()
        .map_err(|error| error.to_string())?;
    let url = format!("http://127.0.0.1:{}{}", endpoint.port, QUOTA_SUMMARY_PATH);
    let response = client
        .post(url)
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "CYBOARD/0.1.0")
        .header("Connect-Protocol-Version", "1")
        .header("X-Codeium-Csrf-Token", &endpoint.csrf_token)
        .json(&json!({ "forceRefresh": true }))
        .send()
        .map_err(|error| format!("Antigravity local quota request failed: {error}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Antigravity local quota service returned HTTP {}", status.as_u16()));
    }
    let payload = response
        .json::<Value>()
        .map_err(|error| format!("Antigravity quota response could not be parsed: {error}"))?;
    Ok(parse_quota_summary(&payload))
}

fn parse_quota_summary(payload: &Value) -> Vec<QuotaWindow> {
    let root = payload.get("response").unwrap_or(payload);
    let Some(groups) = root.get("groups").and_then(Value::as_array) else {
        return Vec::new();
    };
    let mut quota = Vec::new();
    for group in groups {
        let group_name = group
            .get("displayName")
            .or_else(|| group.get("display_name"))
            .and_then(Value::as_str)
            .unwrap_or("Models");
        let Some(buckets) = group.get("buckets").and_then(Value::as_array) else {
            continue;
        };
        for bucket in buckets {
            if bucket.get("disabled").and_then(Value::as_bool) == Some(true) {
                continue;
            }
            let Some(remaining_fraction) = remaining_fraction(bucket) else {
                continue;
            };
            let bucket_id = bucket
                .get("bucketId")
                .or_else(|| bucket.get("bucket_id"))
                .and_then(Value::as_str)
                .unwrap_or("quota");
            let bucket_name = bucket
                .get("displayName")
                .or_else(|| bucket.get("display_name"))
                .and_then(Value::as_str)
                .unwrap_or(bucket_id);
            let cadence = cadence_label(bucket_id, bucket_name);
            let family = family_label(group_name);
            quota.push(QuotaWindow {
                id: format!("antigravity-{bucket_id}"),
                label: format!("{family} {cadence}"),
                used_percent: ((1.0 - remaining_fraction.clamp(0.0, 1.0)) * 100.0).clamp(0.0, 100.0),
                reset_at: reset_at(bucket),
            });
        }
    }
    quota.sort_by_key(|window| sort_key(&window.label));
    quota
}

fn remaining_fraction(bucket: &Value) -> Option<f64> {
    bucket
        .get("remainingFraction")
        .or_else(|| bucket.get("remaining_fraction"))
        .and_then(number)
        .or_else(|| {
            let remaining = bucket.get("remaining")?;
            remaining
                .get("remainingFraction")
                .or_else(|| remaining.get("remaining_fraction"))
                .and_then(number)
                .or_else(|| {
                    (remaining.get("case")?.as_str()? == "remainingFraction")
                        .then(|| remaining.get("value").and_then(number))
                        .flatten()
                })
        })
}

fn number(value: &Value) -> Option<f64> {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
}

fn reset_at(bucket: &Value) -> Option<String> {
    for key in ["resetTime", "reset_time", "resetsAt", "resets_at"] {
        if let Some(value) = bucket.get(key) {
            if let Some(text) = value.as_str().filter(|text| !text.trim().is_empty()) {
                return Some(text.to_string());
            }
            if let Some(seconds) = value.as_i64() {
                return chrono::DateTime::from_timestamp(seconds, 0).map(|date| date.to_rfc3339());
            }
        }
    }
    None
}

fn family_label(group_name: &str) -> &'static str {
    let lower = group_name.to_lowercase();
    if lower.contains("gemini") {
        "Gemini"
    } else if lower.contains("claude") || lower.contains("gpt") {
        "Claude/GPT"
    } else {
        "Models"
    }
}

fn cadence_label(bucket_id: &str, bucket_name: &str) -> &'static str {
    let text = format!("{} {}", bucket_id, bucket_name).to_lowercase();
    if text.contains("week") || text.contains("7d") || text.contains("seven") {
        "7d"
    } else {
        "5h"
    }
}

fn sort_key(label: &str) -> u8 {
    match (label.starts_with("Gemini"), label.ends_with("5h")) {
        (true, true) => 0,
        (true, false) => 1,
        (false, true) => 2,
        (false, false) => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_antigravity_process_flags() {
        let line = "101 /Applications/Antigravity.app/Contents/Resources/bin/language_server_macos_arm --csrf_token ide-token --app_data_dir antigravity --extension_server_port 54977";
        assert_eq!(
            parse_process_line(line),
            Some(LocalEndpoint {
                port: 54977,
                csrf_token: "ide-token".into(),
            })
        );
    }

    #[test]
    fn parses_gemini_and_claude_quota_pools() {
        let payload = json!({
            "groups": [
                {
                    "displayName": "Gemini Models",
                    "buckets": [
                        {"bucketId": "gemini-5h", "displayName": "5-hour Limit", "remainingFraction": 0.62, "resetTime": "2026-09-01T20:00:00Z"},
                        {"bucketId": "gemini-weekly", "displayName": "Weekly Limit", "remaining": {"case": "remainingFraction", "value": 0.41}}
                    ]
                },
                {
                    "displayName": "Claude and GPT models",
                    "buckets": [
                        {"bucketId": "3p-5h", "remaining": {"remainingFraction": 0.8}},
                        {"bucketId": "3p-weekly", "remainingFraction": 0.7}
                    ]
                }
            ]
        });
        let quota = parse_quota_summary(&payload);
        assert_eq!(quota.len(), 4);
        assert_eq!(quota[0].label, "Gemini 5h");
        assert_eq!(quota[1].label, "Gemini 7d");
        assert_eq!(quota[2].label, "Claude/GPT 5h");
        assert_eq!(quota[3].label, "Claude/GPT 7d");
        assert_eq!(quota[0].used_percent.round(), 38.0);
        assert_eq!(quota[2].used_percent.round(), 20.0);
    }
}
