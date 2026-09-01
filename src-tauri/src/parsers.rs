use crate::models::QuotaWindow;
use chrono::{TimeZone, Utc};
use serde_json::Value;

pub fn parse_codex_quota(payload: &Value) -> Vec<QuotaWindow> {
    let rate_limits = payload.get("rateLimits").unwrap_or(payload);
    ["primary", "secondary"]
        .into_iter()
        .filter_map(|id| rate_limits.get(id).filter(|value| !value.is_null()).and_then(|value| parse_codex_window(id, value)))
        .collect()
}

fn parse_codex_window(id: &str, value: &Value) -> Option<QuotaWindow> {
    let used = number(value.get("usedPercent")?)?;
    let duration = value.get("windowDurationMins").and_then(Value::as_u64);
    let label = match duration {
        Some(300) => "5h".to_string(),
        Some(10_080) => "7d".to_string(),
        Some(minutes) if minutes >= 40_000 => "Monthly".to_string(),
        Some(minutes) => format!("{minutes}m"),
        None => id.to_string(),
    };
    Some(QuotaWindow {
        id: id.to_string(),
        label,
        used_percent: used.clamp(0.0, 100.0),
        reset_at: value.get("resetsAt").and_then(epoch_or_iso),
    })
}

pub fn parse_claude_quota(payload: &Value) -> Vec<QuotaWindow> {
    let mut quota = Vec::new();
    for (id, label, keys) in [
        ("five-hour", "5h", ["five_hour", "fiveHour", "5h"]),
        ("weekly", "7d", ["seven_day", "sevenDay", "weekly"]),
    ] {
        let Some(window) = keys.iter().find_map(|key| payload.get(*key)) else { continue };
        let Some(used_percent) = window.get("utilization").or_else(|| window.get("percent")).and_then(number) else { continue };
        quota.push(QuotaWindow {
            id: id.into(),
            label: label.into(),
            used_percent: used_percent.clamp(0.0, 100.0),
            reset_at: window.get("resets_at").or_else(|| window.get("reset_at")).and_then(epoch_or_iso),
        });
    }

    if let Some(limits) = payload.get("limits").and_then(Value::as_array) {
        for (index, entry) in limits.iter().enumerate() {
            let Some(percent) = entry.get("percent").or_else(|| entry.get("utilization")).and_then(number) else { continue };
            let group = entry.get("group").or_else(|| entry.get("kind")).and_then(Value::as_str).unwrap_or("limit");
            let label = match group {
                "session" => "5h".to_string(),
                "weekly" => scoped_weekly_label(entry),
                other => other.to_string(),
            };
            if quota.iter().any(|window| window.label == label) {
                continue;
            }
            quota.push(QuotaWindow {
                id: format!("limit-{index}"),
                label,
                used_percent: percent.clamp(0.0, 100.0),
                reset_at: entry.get("resets_at").or_else(|| entry.get("reset_at")).and_then(epoch_or_iso),
            });
        }
    }
    quota
}

fn scoped_weekly_label(entry: &Value) -> String {
    entry
        .get("scope")
        .and_then(|scope| scope.get("model"))
        .and_then(|model| model.get("display_name"))
        .and_then(Value::as_str)
        .filter(|name| !name.trim().is_empty())
        .map(|name| format!("7d·{name}"))
        .unwrap_or_else(|| "7d".into())
}

pub fn parse_cursor_quota(payload: &Value) -> Vec<QuotaWindow> {
    let reset_at = find_string_recursive(payload, &["resetAt", "resetsAt", "currentPeriodEnd", "periodEnd"]);

    if let Some(used_percent) = find_number_recursive(payload, &["usedPercent", "usagePercent", "percentUsed", "percent"]) {
        return vec![QuotaWindow {
            id: "current-period".into(),
            label: "Current period".into(),
            used_percent: used_percent.clamp(0.0, 100.0),
            reset_at,
        }];
    }
    if let Some(remaining_percent) = find_number_recursive(payload, &["remainingPercent", "percentRemaining"]) {
        return vec![QuotaWindow {
            id: "current-period".into(),
            label: "Current period".into(),
            used_percent: (100.0 - remaining_percent).clamp(0.0, 100.0),
            reset_at,
        }];
    }

    let used = find_number_recursive(payload, &["used", "usage", "currentUsage", "usedAmount"]);
    let limit = find_number_recursive(payload, &["limit", "total", "included", "usageLimit", "limitAmount"]);
    match (used, limit) {
        (Some(used), Some(limit)) if limit > 0.0 && used >= 0.0 => vec![QuotaWindow {
            id: "current-period".into(),
            label: "Current period".into(),
            used_percent: (used / limit * 100.0).clamp(0.0, 100.0),
            reset_at,
        }],
        _ => Vec::new(),
    }
}

pub fn find_string_recursive(value: &Value, keys: &[&str]) -> Option<String> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(text) = map.get(*key).and_then(Value::as_str).filter(|text| !text.trim().is_empty()) {
                    return Some(text.to_string());
                }
            }
            map.values().find_map(|nested| find_string_recursive(nested, keys))
        }
        Value::Array(items) => items.iter().find_map(|nested| find_string_recursive(nested, keys)),
        _ => None,
    }
}

pub fn find_number_recursive(value: &Value, keys: &[&str]) -> Option<f64> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(value) = map.get(*key).and_then(number) {
                    return Some(value);
                }
            }
            map.values().find_map(|nested| find_number_recursive(nested, keys))
        }
        Value::Array(items) => items.iter().find_map(|nested| find_number_recursive(nested, keys)),
        _ => None,
    }
}

fn number(value: &Value) -> Option<f64> {
    value.as_f64().or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
}

fn epoch_or_iso(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return if text.trim().is_empty() { None } else { Some(text.to_string()) };
    }
    let seconds = value.as_i64()?;
    Utc.timestamp_opt(seconds, 0).single().map(|date| date.to_rfc3339())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_codex_duration_and_clamps_percent() {
        let payload = json!({"rateLimits":{"primary":{"usedPercent":112,"windowDurationMins":300,"resetsAt":1780000000},"secondary":{"usedPercent":"42.5","windowDurationMins":10080,"resetsAt":1780100000}}});
        let quota = parse_codex_quota(&payload);
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].label, "5h");
        assert_eq!(quota[0].used_percent, 100.0);
        assert_eq!(quota[1].label, "7d");
        assert_eq!(quota[1].used_percent, 42.5);
    }

    #[test]
    fn ignores_null_or_malformed_codex_windows() {
        let payload = json!({"rateLimits":{"primary":null,"secondary":{"windowDurationMins":10080}}});
        assert!(parse_codex_quota(&payload).is_empty());
    }

    #[test]
    fn parses_legacy_claude_windows() {
        let payload = json!({"five_hour":{"utilization":33,"resets_at":"2026-09-01T12:00:00Z"},"seven_day":{"utilization":71,"resets_at":"2026-09-07T12:00:00Z"}});
        let quota = parse_claude_quota(&payload);
        assert_eq!(quota.iter().map(|window| window.label.as_str()).collect::<Vec<_>>(), vec!["5h", "7d"]);
    }

    #[test]
    fn parses_new_claude_limits_and_scoped_model() {
        let payload = json!({"limits":[{"group":"session","percent":20,"resets_at":"2026-09-01T12:00:00Z"},{"group":"weekly","percent":40,"scope":{"model":{"display_name":"Fable"}}}]});
        let quota = parse_claude_quota(&payload);
        assert_eq!(quota[0].label, "5h");
        assert_eq!(quota[1].label, "7d·Fable");
    }

    #[test]
    fn avoids_duplicate_claude_windows_between_legacy_and_limits() {
        let payload = json!({"five_hour":{"utilization":33},"limits":[{"group":"session","percent":44}]});
        let quota = parse_claude_quota(&payload);
        assert_eq!(quota.len(), 1);
        assert_eq!(quota[0].used_percent, 33.0);
    }

    #[test]
    fn parses_cursor_direct_percentage() {
        let payload = json!({"period":{"usagePercent":62.5,"currentPeriodEnd":"2026-09-15T00:00:00Z"}});
        let quota = parse_cursor_quota(&payload);
        assert_eq!(quota[0].used_percent, 62.5);
        assert_eq!(quota[0].reset_at.as_deref(), Some("2026-09-15T00:00:00Z"));
    }

    #[test]
    fn parses_cursor_remaining_percentage() {
        let payload = json!({"period":{"percentRemaining":72}});
        assert_eq!(parse_cursor_quota(&payload)[0].used_percent, 28.0);
    }

    #[test]
    fn derives_cursor_percent_from_used_and_limit() {
        let payload = json!({"period":{"currentUsage":125,"usageLimit":500}});
        assert_eq!(parse_cursor_quota(&payload)[0].used_percent, 25.0);
    }

    #[test]
    fn returns_empty_cursor_quota_for_unknown_schema() {
        assert!(parse_cursor_quota(&json!({"hello":"world"})).is_empty());
    }
}
