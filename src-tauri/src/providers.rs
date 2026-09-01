use crate::models::{ProviderIssue, ProviderSnapshot, QuotaWindow};
use chrono::{TimeZone, Utc};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

pub fn collect_all() -> Vec<ProviderSnapshot> {
    vec![collect_codex(), collect_claude(), collect_cursor()]
}

fn epoch_to_iso(value: &Value) -> Option<String> {
    let seconds = value.as_i64()?;
    Utc.timestamp_opt(seconds, 0).single().map(|date| date.to_rfc3339())
}

fn normalize_window(id: &str, value: &Value) -> Option<QuotaWindow> {
    let used = value.get("usedPercent")?.as_f64()?;
    let duration = value.get("windowDurationMins").and_then(Value::as_u64);
    let label = match duration {
        Some(300) => "5h".to_string(),
        Some(10080) => "7d".to_string(),
        Some(minutes) if minutes >= 40_000 => "Monthly".to_string(),
        Some(minutes) => format!("{}m", minutes),
        None => id.to_string(),
    };
    Some(QuotaWindow {
        id: id.to_string(),
        label,
        used_percent: used.clamp(0.0, 100.0),
        reset_at: value.get("resetsAt").and_then(epoch_to_iso),
    })
}

fn codex_binary() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CODEX_BINARY_PATH") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }
    let app = PathBuf::from("/Applications/Codex.app/Contents/Resources/codex");
    if app.exists() {
        return Some(app);
    }
    which::which("codex").ok()
}

fn read_json_rpc_response(reader: &mut BufReader<std::process::ChildStdout>, id: i64, timeout: Duration) -> Result<Value, String> {
    let started = Instant::now();
    let mut line = String::new();
    while started.elapsed() < timeout {
        line.clear();
        let count = reader.read_line(&mut line).map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Codex app-server closed stdout".into());
        }
        let Ok(value) = serde_json::from_str::<Value>(&line) else { continue };
        if value.get("id").and_then(Value::as_i64) == Some(id) {
            if let Some(error) = value.get("error") {
                return Err(format!("Codex RPC error: {error}"));
            }
            return Ok(value.get("result").cloned().unwrap_or(Value::Null));
        }
    }
    Err("Codex app-server timed out".into())
}

fn collect_codex() -> ProviderSnapshot {
    let Some(binary) = codex_binary() else {
        return ProviderSnapshot::unavailable("codex", "Codex", "not-installed", "Codex CLI or desktop app was not found");
    };
    let mut child = match Command::new(binary)
        .args(["app-server", "--stdio"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => return ProviderSnapshot::unavailable("codex", "Codex", "unknown", error.to_string()),
    };
    let Some(mut stdin) = child.stdin.take() else {
        return ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Unable to open Codex app-server stdin");
    };
    let Some(stdout) = child.stdout.take() else {
        return ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Unable to open Codex app-server stdout");
    };
    let mut reader = BufReader::new(stdout);

    let initialize = json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"clientInfo":{"name":"cyboard","version":"0.1.0"},"capabilities":{"experimentalApi":true}}});
    if writeln!(stdin, "{initialize}").is_err() || stdin.flush().is_err() {
        let _ = child.kill();
        return ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Unable to initialize Codex app-server");
    }
    if let Err(error) = read_json_rpc_response(&mut reader, 1, Duration::from_secs(10)) {
        let _ = child.kill();
        return ProviderSnapshot::unavailable("codex", "Codex", "login-required", error);
    }
    let _ = writeln!(stdin, "{}", json!({"jsonrpc":"2.0","method":"initialized","params":{}}));
    let _ = writeln!(stdin, "{}", json!({"jsonrpc":"2.0","id":2,"method":"account/rateLimits/read","params":{}}));
    let _ = stdin.flush();
    let result = read_json_rpc_response(&mut reader, 2, Duration::from_secs(15));
    let _ = child.kill();

    let result = match result {
        Ok(result) => result,
        Err(error) => return ProviderSnapshot::unavailable("codex", "Codex", "network", error),
    };
    let rate_limits = result.get("rateLimits").unwrap_or(&result);
    let mut quota = Vec::new();
    if let Some(primary) = rate_limits.get("primary").filter(|value| !value.is_null()).and_then(|value| normalize_window("primary", value)) {
        quota.push(primary);
    }
    if let Some(secondary) = rate_limits.get("secondary").filter(|value| !value.is_null()).and_then(|value| normalize_window("secondary", value)) {
        quota.push(secondary);
    }
    if quota.is_empty() {
        return ProviderSnapshot::unavailable("codex", "Codex", "schema-changed", "Codex returned no recognized quota windows");
    }
    ProviderSnapshot {
        provider: "codex".into(),
        display_name: "Codex".into(),
        capabilities: vec!["quota".into()],
        quota,
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "fresh".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: None,
    }
}

fn security_password(service: &str) -> Option<String> {
    let output = Command::new("/usr/bin/security")
        .args(["find-generic-password", "-s", service, "-w"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok().map(|value| value.trim().to_string()).filter(|value| !value.is_empty())
}

fn curl_json(args: &[&str]) -> Result<Value, String> {
    let output = Command::new("/usr/bin/curl")
        .args(["--silent", "--show-error", "--fail-with-body", "--max-time", "15"])
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())
}

fn find_recursive_string(value: &Value, keys: &[&str]) -> Option<String> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(text) = map.get(*key).and_then(Value::as_str).filter(|text| !text.trim().is_empty()) {
                    return Some(text.to_string());
                }
            }
            map.values().find_map(|nested| find_recursive_string(nested, keys))
        }
        Value::Array(items) => items.iter().find_map(|nested| find_recursive_string(nested, keys)),
        _ => None,
    }
}

fn parse_iso(value: &Value) -> Option<String> {
    value.as_str().map(ToString::to_string)
}

fn collect_claude() -> ProviderSnapshot {
    if which::which("claude").is_err() {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "not-installed", "Claude Code CLI was not found");
    }
    let credential_text = security_password("Claude Code-credentials")
        .or_else(|| std::fs::read_to_string(dirs_home().join(".claude/.credentials.json")).ok());
    let Some(credential_text) = credential_text else {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "login-required", "Claude Code OAuth credentials were not found");
    };
    let Ok(credentials) = serde_json::from_str::<Value>(&credential_text) else {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "schema-changed", "Claude Code credentials could not be parsed");
    };
    let Some(access_token) = find_recursive_string(&credentials, &["accessToken", "access_token"]) else {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "login-required", "Claude Code OAuth token is unavailable");
    };
    let authorization = format!("Authorization: Bearer {access_token}");
    let payload = match curl_json(&[
        "-H", &authorization,
        "-H", "Accept: application/json",
        "-H", "anthropic-beta: oauth-2025-04-20",
        "-H", "User-Agent: claude-code/2.1.197",
        "https://api.anthropic.com/api/oauth/usage",
    ]) {
        Ok(payload) => payload,
        Err(error) => return ProviderSnapshot::unavailable("claude", "Claude Code", "network", error),
    };
    let mut quota = Vec::new();
    for (id, label, keys) in [
        ("five-hour", "5h", ["five_hour", "fiveHour", "5h"]),
        ("weekly", "7d", ["seven_day", "sevenDay", "weekly"]),
    ] {
        let window = keys.iter().find_map(|key| payload.get(*key));
        if let Some(window) = window {
            let used = window.get("utilization").or_else(|| window.get("percent")).and_then(Value::as_f64);
            if let Some(used_percent) = used {
                quota.push(QuotaWindow {
                    id: id.into(),
                    label: label.into(),
                    used_percent: used_percent.clamp(0.0, 100.0),
                    reset_at: window.get("resets_at").or_else(|| window.get("reset_at")).and_then(parse_iso),
                });
            }
        }
    }
    if let Some(limits) = payload.get("limits").and_then(Value::as_array) {
        for (index, entry) in limits.iter().enumerate() {
            let Some(percent) = entry.get("percent").or_else(|| entry.get("utilization")).and_then(Value::as_f64) else { continue };
            let group = entry.get("group").or_else(|| entry.get("kind")).and_then(Value::as_str).unwrap_or("limit");
            let label = if group == "session" { "5h" } else if group == "weekly" { "7d" } else { group };
            if !quota.iter().any(|window| window.label == label) {
                quota.push(QuotaWindow {
                    id: format!("limit-{index}"),
                    label: label.into(),
                    used_percent: percent.clamp(0.0, 100.0),
                    reset_at: entry.get("resets_at").or_else(|| entry.get("reset_at")).and_then(parse_iso),
                });
            }
        }
    }
    ProviderSnapshot {
        provider: "claude".into(),
        display_name: "Claude Code".into(),
        capabilities: if quota.is_empty() { vec![] } else { vec!["quota".into()] },
        quota,
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "fresh".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: None,
    }
}

fn dirs_home() -> PathBuf {
    std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("~"))
}

fn cursor_state_db() -> Option<PathBuf> {
    let home = dirs_home();
    [
        home.join("Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor Nightly/User/globalStorage/state.vscdb"),
    ]
    .into_iter()
    .filter(|path| path.exists())
    .max_by_key(|path| std::fs::metadata(path).and_then(|meta| meta.modified()).ok())
}

fn sqlite_value(path: &PathBuf, key: &str) -> Option<String> {
    let query = format!("SELECT value FROM ItemTable WHERE key='{}' LIMIT 1;", key.replace('\'', "''"));
    let output = Command::new("/usr/bin/sqlite3")
        .args(["-readonly", "-batch", "-noheader"])
        .arg(path)
        .arg(query)
        .output()
        .ok()?;
    if !output.status.success() { return None; }
    let text = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if text.starts_with('"') {
        serde_json::from_str::<String>(&text).ok()
    } else if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn collect_cursor() -> ProviderSnapshot {
    let Some(state) = cursor_state_db() else {
        return ProviderSnapshot::unavailable("cursor", "Cursor", "not-installed", "Cursor local state database was not found");
    };
    let Some(access_token) = sqlite_value(&state, "cursorAuth/accessToken") else {
        return ProviderSnapshot::unavailable("cursor", "Cursor", "login-required", "Cursor is not signed in");
    };
    let authorization = format!("Authorization: Bearer {access_token}");
    let payload = match curl_json(&[
        "-X", "POST",
        "-H", &authorization,
        "-H", "Content-Type: application/json",
        "-H", "Accept: application/json",
        "-H", "Connect-Protocol-Version: 1",
        "--data", "{}",
        "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage",
    ]) {
        Ok(payload) => payload,
        Err(error) => return ProviderSnapshot::unavailable("cursor", "Cursor", "network", error),
    };
    let mut quota = Vec::new();
    let used = find_number_recursive(&payload, &["usedPercent", "usagePercent", "percentUsed", "percent"]);
    let remaining = find_number_recursive(&payload, &["remainingPercent", "percentRemaining"]);
    if let Some(used_percent) = used.or_else(|| remaining.map(|value| 100.0 - value)) {
        quota.push(QuotaWindow {
            id: "current-period".into(),
            label: "Current period".into(),
            used_percent: used_percent.clamp(0.0, 100.0),
            reset_at: find_recursive_string(&payload, &["resetAt", "resetsAt", "currentPeriodEnd", "periodEnd"]),
        });
    }
    ProviderSnapshot {
        provider: "cursor".into(),
        display_name: "Cursor".into(),
        capabilities: if quota.is_empty() { vec![] } else { vec!["quota".into()] },
        quota,
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: if payload.is_null() { "unavailable".into() } else { "fresh".into() },
        updated_at: Utc::now().to_rfc3339(),
        issue: if payload.is_null() { Some(ProviderIssue { code: "schema-changed".into(), message: "Cursor usage payload was empty".into(), retry_at: None }) } else { None },
    }
}

fn find_number_recursive(value: &Value, keys: &[&str]) -> Option<f64> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(number) = map.get(*key).and_then(Value::as_f64) {
                    return Some(number);
                }
            }
            map.values().find_map(|nested| find_number_recursive(nested, keys))
        }
        Value::Array(items) => items.iter().find_map(|nested| find_number_recursive(nested, keys)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_codex_windows_by_duration() {
        let window = json!({"usedPercent": 42.5, "windowDurationMins": 10080, "resetsAt": 1780000000});
        let normalized = normalize_window("secondary", &window).unwrap();
        assert_eq!(normalized.label, "7d");
        assert_eq!(normalized.used_percent, 42.5);
        assert!(normalized.reset_at.is_some());
    }

    #[test]
    fn recursively_finds_cursor_percentages() {
        let payload = json!({"usage": {"current": {"remainingPercent": 72.0}}});
        assert_eq!(find_number_recursive(&payload, &["remainingPercent"]), Some(72.0));
    }
}
