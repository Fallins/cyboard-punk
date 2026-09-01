use crate::models::QuotaWindow;
use chrono::{TimeZone, Utc};
use serde_json::Value;

pub fn parse_codex_quota(payload: &Value) -> Vec<QuotaWindow> {
    let rate_limits = payload
        .get("rate_limit")
        .or_else(|| payload.get("rateLimit"))
        .or_else(|| payload.get("rateLimits"))
        .unwrap_or(payload);

    let mut quota = Vec::new();
    if let Some(window) = rate_limits
        .get("primary_window")
        .or_else(|| rate_limits.get("primaryWindow"))
        .or_else(|| rate_limits.get("primary"))
        .filter(|value| !value.is_null())
        .and_then(|value| parse_codex_window("primary", value))
    {
        quota.push(window);
    }
    if let Some(window) = rate_limits
        .get("secondary_window")
        .or_else(|| rate_limits.get("secondaryWindow"))
        .or_else(|| rate_limits.get("secondary"))
        .filter(|value| !value.is_null())
        .and_then(|value| parse_codex_window("secondary", value))
    {
        quota.push(window);
    }
    quota
}

fn parse_codex_window(id: &str, value: &Value) -> Option<QuotaWindow> {
    let used = value
        .get("used_percent")
        .or_else(|| value.get("usedPercent"))
        .and_then(number)?;
    let duration_mins = value
        .get("windowDurationMins")
        .and_then(Value::as_u64)
        .or_else(|| {
            value
                .get("limit_window_seconds")
                .and_then(Value::as_u64)
                .map(|seconds| seconds / 60)
        });
    let label = match duration_mins {
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
        reset_at: value
            .get("reset_at")
            .or_else(|| value.get("resetsAt"))
            .or_else(|| value.get("resetAt"))
            .and_then(epoch_or_iso),
    })
}

pub fn parse_claude_quota(payload: &Value) -> Vec<QuotaWindow> {
    let mut quota = Vec::new();
    for (id, label, keys) in [
        ("five-hour", "5h", ["five_hour", "fiveHour", "5h"]),
        ("weekly", "7d", ["seven_day", "sevenDay", "weekly"]),
    ] {
        let Some(window) = keys.iter().find_map(|key| payload.get(*key)) else {
            continue;
        };
        let Some(used_percent) = window
            .get("utilization")
            .or_else(|| window.get("percent"))
            .and_then(number)
        else {
            continue;
        };
        quota.push(QuotaWindow {
            id: id.into(),
            label: label.into(),
            used_percent: used_percent.clamp(0.0, 100.0),
            reset_at: window
                .get("resets_at")
                .or_else(|| window.get("reset_at"))
                .and_then(epoch_or_iso),
        });
    }

    if let Some(limits) = payload.get("limits").and_then(Value::as_array) {
        for (index, entry) in limits.iter().enumerate() {
            let Some(percent) = entry
                .get("percent")
                .or_else(|| entry.get("utilization"))
                .and_then(number)
            else {
                continue;
            };
            let group = entry
                .get("group")
                .or_else(|| entry.get("kind"))
                .and_then(Value::as_str)
                .unwrap_or("limit");
            let label = match group {
                "session" => "5h".to_string(),
                "weekly" | "weekly_scoped" => scoped_weekly_label(entry),
                other => other.to_string(),
            };
            if quota.iter().any(|window| window.label == label) {
                continue;
            }
            quota.push(QuotaWindow {
                id: format!("limit-{index}"),
                label,
                used_percent: percent.clamp(0.0, 100.0),
                reset_at: entry
                    .get("resets_at")
                    .or_else(|| entry.get("reset_at"))
                    .and_then(epoch_or_iso),
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
    let reset_at = payload
        .get("billingCycleEnd")
        .and_then(epoch_or_iso)
        .or_else(|| find_string_recursive(payload, &["resetAt", "resetsAt", "currentPeriodEnd", "periodEnd"]));

    if let Some(plan) = payload.pointer("/individualUsage/plan") {
        let total_percent = plan
            .get("totalPercentUsed")
            .and_then(number)
            .or_else(|| derive_percent(plan));
        let auto_percent = plan.get("autoPercentUsed").and_then(number);
        let api_percent = plan.get("apiPercentUsed").and_then(number);
        let mut quota = Vec::new();

        if let Some(percent) = total_percent {
            quota.push(QuotaWindow {
                id: "plan".into(),
                label: "Plan".into(),
                used_percent: percent.clamp(0.0, 100.0),
                reset_at: reset_at.clone(),
            });
        }
        if let Some(percent) = auto_percent {
            quota.push(QuotaWindow {
                id: "auto".into(),
                label: "Cursor".into(),
                used_percent: percent.clamp(0.0, 100.0),
                reset_at: reset_at.clone(),
            });
        }
        if let Some(percent) = api_percent {
            quota.push(QuotaWindow {
                id: "api".into(),
                label: "Third party".into(),
                used_percent: percent.clamp(0.0, 100.0),
                reset_at: reset_at.clone(),
            });
        }
        if !quota.is_empty() {
            return quota;
        }
    }

    if let Some(used_percent) =
        find_number_recursive(payload, &["usedPercent", "usagePercent", "percentUsed", "percent"])
    {
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

fn derive_percent(value: &Value) -> Option<f64> {
    let used = value.get("used").and_then(number)?;
    let limit = value.get("limit").and_then(number)?;
    (limit > 0.0 && used >= 0.0).then_some(used / limit * 100.0)
}

pub fn find_string_recursive(value: &Value, keys: &[&str]) -> Option<String> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(text) = map
                    .get(*key)
                    .and_then(Value::as_str)
                    .filter(|text| !text.trim().is_empty())
                {
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
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
}

fn epoch_or_iso(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return if text.trim().is_empty() {
            None
        } else {
            Some(text.to_string())
        };
    }
    let seconds = value.as_i64()?;
    Utc.timestamp_opt(seconds, 0)
        .single()
        .map(|date| date.to_rfc3339())
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
    fn parses_codex_wham_usage_shape() {
        let payload = json!({"rate_limit":{"primary_window":{"used_percent":15,"reset_at":1780000000,"limit_window_seconds":18000},"secondary_window":{"used_percent":5,"reset_at":1780100000,"limit_window_seconds":604800}}});
        let quota = parse_codex_quota(&payload);
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].label, "5h");
        assert_eq!(quota[0].used_percent, 15.0);
        assert_eq!(quota[1].label, "7d");
        assert_eq!(quota[1].used_percent, 5.0);
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
        assert_eq!(
            quota.iter().map(|window| window.label.as_str()).collect::<Vec<_>>(),
            vec!["5h", "7d"]
        );
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
    fn parses_cursor_usage_summary() {
        let payload = json!({
            "billingCycleEnd":"2026-09-15T00:00:00Z",
            "individualUsage":{"plan":{"used":1250,"limit":5000,"autoPercentUsed":20,"apiPercentUsed":30,"totalPercentUsed":25}}
        });
        let quota = parse_cursor_quota(&payload);
        assert_eq!(quota.len(), 3);
        assert_eq!(quota[0].label, "Plan");
        assert_eq!(quota[0].used_percent, 25.0);
        assert_eq!(quota[1].label, "Cursor");
        assert_eq!(quota[2].label, "Third party");
        assert_eq!(quota[0].reset_at.as_deref(), Some("2026-09-15T00:00:00Z"));
    }

    #[test]
    fn derives_cursor_usage_summary_percent_from_cents() {
        let payload = json!({"individualUsage":{"plan":{"used":1250,"limit":5000}}});
        assert_eq!(parse_cursor_quota(&payload)[0].used_percent, 25.0);
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
