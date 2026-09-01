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
    let root = payload.get("rate_limits").unwrap_or(payload);
    let mut quota = Vec::new();
    for (id, label, keys) in [
        ("five-hour", "5h", ["five_hour", "fiveHour", "5h"]),
        ("weekly", "7d", ["seven_day", "sevenDay", "weekly"]),
    ] {
        let Some(window) = keys.iter().find_map(|key| root.get(*key)) else {
            continue;
        };
        let Some(used_percent) = window
            .get("utilization")
            .or_else(|| window.get("used_percentage"))
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

    if let Some(limits) = root.get("limits").and_then(Value::as_array) {
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
    if let Some(plan_usage) = payload.get("planUsage").or_else(|| payload.get("plan_usage")) {
        let reset_at = payload
            .get("billingCycleEnd")
            .or_else(|| payload.get("billing_cycle_end"))
            .and_then(epoch_or_iso);
        let mut quota = Vec::new();

        let total_percent = plan_usage
            .get("totalPercentUsed")
            .or_else(|| plan_usage.get("total_percent_used"))
            .and_then(number)
            .or_else(|| {
                let used = plan_usage
                    .get("totalSpend")
                    .or_else(|| plan_usage.get("total_spend"))
                    .and_then(number)?;
                let limit = plan_usage.get("limit").and_then(number)?;
                (limit > 0.0 && used >= 0.0).then_some(used / limit * 100.0)
            });

        push_cursor_window(&mut quota, "plan", "Plan", total_percent, reset_at.clone());
        push_cursor_window(
            &mut quota,
            "auto",
            "Auto",
            plan_usage
                .get("autoPercentUsed")
                .or_else(|| plan_usage.get("auto_percent_used"))
                .and_then(number),
            reset_at.clone(),
        );
        push_cursor_window(
            &mut quota,
            "api",
            "API",
            plan_usage
                .get("apiPercentUsed")
                .or_else(|| plan_usage.get("api_percent_used"))
                .and_then(number),
            reset_at,
        );

        if !quota.is_empty() {
            return quota;
        }
    }

    let reset_at = payload
        .get("billingCycleEnd")
        .or_else(|| payload.get("billing_cycle_end"))
        .and_then(epoch_or_iso)
        .or_else(|| find_reset_recursive(payload));

    if let Some(plan) = payload.pointer("/individualUsage/plan") {
        let mut quota = Vec::new();
        let total_percent = plan
            .get("totalPercentUsed")
            .and_then(number)
            .or_else(|| derive_percent(plan));
        push_cursor_window(&mut quota, "plan", "Plan", total_percent, reset_at.clone());
        push_cursor_window(
            &mut quota,
            "auto",
            "Auto",
            plan.get("autoPercentUsed").and_then(number),
            reset_at.clone(),
        );
        push_cursor_window(
            &mut quota,
            "api",
            "API",
            plan.get("apiPercentUsed").and_then(number),
            reset_at.clone(),
        );
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

fn push_cursor_window(
    quota: &mut Vec<QuotaWindow>,
    id: &str,
    label: &str,
    percent: Option<f64>,
    reset_at: Option<String>,
) {
    let Some(percent) = percent.filter(|value| value.is_finite()) else {
        return;
    };
    quota.push(QuotaWindow {
        id: id.into(),
        label: label.into(),
        used_percent: percent.clamp(0.0, 100.0),
        reset_at,
    });
}

fn derive_percent(value: &Value) -> Option<f64> {
    let used = value.get("used").and_then(number)?;
    let limit = value.get("limit").and_then(number)?;
    (limit > 0.0 && used >= 0.0).then_some(used / limit * 100.0)
}

fn find_reset_recursive(value: &Value) -> Option<String> {
    match value {
        Value::Object(map) => {
            for key in ["resetAt", "resetsAt", "currentPeriodEnd", "periodEnd"] {
                if let Some(reset) = map.get(key).and_then(epoch_or_iso) {
                    return Some(reset);
                }
            }
            map.values().find_map(find_reset_recursive)
        }
        Value::Array(items) => items.iter().find_map(find_reset_recursive),
        _ => None,
    }
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
        .or_else(|| value.as_str().and_then(|text| text.trim().parse::<f64>().ok()))
}

fn epoch_or_iso(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        let text = text.trim();
        if text.is_empty() {
            return None;
        }
        if let Ok(epoch) = text.parse::<i64>() {
            return epoch_number_to_iso(epoch);
        }
        return Some(text.to_string());
    }
    epoch_number_to_iso(value.as_i64()?)
}

fn epoch_number_to_iso(value: i64) -> Option<String> {
    let (seconds, nanos) = if value.abs() >= 10_000_000_000 {
        let seconds = value / 1_000;
        let millis = value.rem_euclid(1_000) as u32;
        (seconds, millis * 1_000_000)
    } else {
        (value, 0)
    };
    Utc.timestamp_opt(seconds, nanos)
        .single()
        .map(|date| date.to_rfc3339())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_codex_wham_usage_shape_with_both_windows() {
        let payload = json!({
            "rate_limit": {
                "primary_window": {"used_percent": 15, "reset_at": 1780000000, "limit_window_seconds": 18000},
                "secondary_window": {"used_percent": 42.5, "reset_at": 1780100000, "limit_window_seconds": 604800}
            }
        });
        let quota = parse_codex_quota(&payload);
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].label, "5h");
        assert_eq!(quota[1].label, "7d");
        assert_eq!(quota[1].used_percent, 42.5);
    }

    #[test]
    fn parses_codex_app_server_shape() {
        let payload = json!({
            "rateLimits": {
                "primary": {"usedPercent": 12, "windowDurationMins": 300, "resetsAt": 1780000000},
                "secondary": {"usedPercent": 22, "windowDurationMins": 10080, "resetsAt": 1780100000}
            }
        });
        let quota = parse_codex_quota(&payload);
        assert_eq!(quota.iter().map(|window| window.label.as_str()).collect::<Vec<_>>(), vec!["5h", "7d"]);
    }

    #[test]
    fn parses_claude_usage_windows() {
        let payload = json!({
            "five_hour": {"utilization": 33, "resets_at": "2026-09-01T12:00:00Z"},
            "seven_day": {"utilization": 71, "resets_at": "2026-09-07T12:00:00Z"}
        });
        let quota = parse_claude_quota(&payload);
        assert_eq!(quota.iter().map(|window| window.label.as_str()).collect::<Vec<_>>(), vec!["5h", "7d"]);
    }

    #[test]
    fn parses_claude_statusline_rate_limits_shape() {
        let payload = json!({
            "rate_limits": {
                "five_hour": {"used_percentage": 23.5, "resets_at": 1780000000},
                "seven_day": {"used_percentage": 41.2, "resets_at": 1780100000}
            }
        });
        let quota = parse_claude_quota(&payload);
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].used_percent, 23.5);
        assert_eq!(quota[1].used_percent, 41.2);
    }

    #[test]
    fn parses_cursor_api2_current_period_usage() {
        let payload = json!({
            "billingCycleStart": "1785884859130",
            "billingCycleEnd": "1788563259130",
            "planUsage": {
                "totalSpend": 1250,
                "includedSpend": 1250,
                "remaining": 3750,
                "limit": 5000,
                "autoPercentUsed": 20,
                "apiPercentUsed": 5,
                "totalPercentUsed": 25
            }
        });
        let quota = parse_cursor_quota(&payload);
        assert_eq!(quota.len(), 3);
        assert_eq!(quota[0].label, "Plan");
        assert_eq!(quota[0].used_percent, 25.0);
        assert_eq!(quota[1].label, "Auto");
        assert_eq!(quota[2].label, "API");
        assert!(quota[0].reset_at.as_deref().is_some_and(|value| value.contains('T')));
    }

    #[test]
    fn parses_cursor_usage_summary() {
        let payload = json!({
            "billingCycleEnd": "2026-09-15T00:00:00Z",
            "individualUsage": {
                "plan": {"used": 1250, "limit": 5000, "autoPercentUsed": 20, "apiPercentUsed": 30, "totalPercentUsed": 25}
            }
        });
        let quota = parse_cursor_quota(&payload);
        assert_eq!(quota.len(), 3);
        assert_eq!(quota[0].used_percent, 25.0);
        assert_eq!(quota[0].reset_at.as_deref(), Some("2026-09-15T00:00:00Z"));
    }

    #[test]
    fn parses_numeric_string_epoch_milliseconds() {
        let reset = epoch_or_iso(&json!("1788563259130")).unwrap();
        assert!(reset.contains('T'));
    }

    #[test]
    fn returns_empty_cursor_quota_for_unknown_schema() {
        assert!(parse_cursor_quota(&json!({"hello": "world"})).is_empty());
    }
}
