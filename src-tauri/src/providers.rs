use crate::models::{ProviderIssue, ProviderSnapshot};
use crate::parsers::{find_string_recursive, parse_claude_quota, parse_codex_quota, parse_cursor_quota};
use chrono::Utc;
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

const NETWORK_TIMEOUT: Duration = Duration::from_secs(15);

pub fn collect_all() -> Vec<ProviderSnapshot> {
    vec![collect_codex(), collect_claude(), collect_cursor()]
}

fn base_snapshot(provider: &str, display_name: &str) -> ProviderSnapshot {
    ProviderSnapshot {
        provider: provider.into(),
        display_name: display_name.into(),
        capabilities: Vec::new(),
        quota: Vec::new(),
        usage: Vec::new(),
        sessions: Vec::new(),
        freshness: "fresh".into(),
        updated_at: Utc::now().to_rfc3339(),
        issue: None,
    }
}

fn with_quota(mut snapshot: ProviderSnapshot, quota: Vec<crate::models::QuotaWindow>) -> ProviderSnapshot {
    snapshot.quota = quota;
    if snapshot.quota.is_empty() {
        snapshot.freshness = "stale".into();
        snapshot.issue = Some(ProviderIssue {
            code: "schema-changed".into(),
            message: format!("{} returned no recognized quota windows", snapshot.display_name),
            retry_at: None,
        });
    } else {
        snapshot.capabilities.push("quota".into());
    }
    snapshot
}

fn codex_binary() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CODEX_BINARY_PATH") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }
    let desktop_binary = PathBuf::from("/Applications/Codex.app/Contents/Resources/codex");
    if desktop_binary.exists() {
        return Some(desktop_binary);
    }
    which::which("codex").ok()
}

fn read_json_rpc_response(reader: &mut BufReader<std::process::ChildStdout>, id: i64) -> Result<Value, String> {
    let mut line = String::new();
    loop {
        line.clear();
        let count = reader.read_line(&mut line).map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Codex app-server closed stdout".into());
        }
        let Ok(value) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        if value.get("id").and_then(Value::as_i64) != Some(id) {
            continue;
        }
        if let Some(error) = value.get("error") {
            return Err(format!("Codex RPC error: {error}"));
        }
        return Ok(value.get("result").cloned().unwrap_or(Value::Null));
    }
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
        let _ = child.kill();
        return ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Unable to open Codex app-server stdin");
    };
    let Some(stdout) = child.stdout.take() else {
        let _ = child.kill();
        return ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Unable to open Codex app-server stdout");
    };
    let mut reader = BufReader::new(stdout);

    let initialize = json!({
        "jsonrpc":"2.0",
        "id":1,
        "method":"initialize",
        "params":{"clientInfo":{"name":"cyboard","version":"0.1.0"},"capabilities":{"experimentalApi":true}}
    });
    if writeln!(stdin, "{initialize}").is_err() || stdin.flush().is_err() {
        let _ = child.kill();
        return ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Unable to initialize Codex app-server");
    }
    if let Err(error) = read_json_rpc_response(&mut reader, 1) {
        let _ = child.kill();
        return ProviderSnapshot::unavailable("codex", "Codex", "login-required", error);
    }
    let _ = writeln!(stdin, "{}", json!({"jsonrpc":"2.0","method":"initialized","params":{}}));
    let _ = writeln!(stdin, "{}", json!({"jsonrpc":"2.0","id":2,"method":"account/rateLimits/read","params":{}}));
    let _ = stdin.flush();
    let result = read_json_rpc_response(&mut reader, 2);
    let _ = child.kill();
    let _ = child.wait();

    match result {
        Ok(result) => with_quota(base_snapshot("codex", "Codex"), parse_codex_quota(&result)),
        Err(error) => ProviderSnapshot::unavailable("codex", "Codex", "network", error),
    }
}

fn home_dir() -> PathBuf {
    std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("~"))
}

fn security_password(service: &str) -> Option<String> {
    let output = Command::new("/usr/bin/security")
        .args(["find-generic-password", "-s", service, "-w"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(NETWORK_TIMEOUT)
        .connect_timeout(Duration::from_secs(8))
        .no_proxy()
        .build()
        .map_err(|error| error.to_string())
}

fn parse_response(response: Response, provider: &str) -> Result<Value, ProviderSnapshot> {
    let status = response.status();
    if status.is_success() {
        return response.json::<Value>().map_err(|error| {
            ProviderSnapshot::unavailable(provider, display_name(provider), "schema-changed", error.to_string())
        });
    }
    let code = match status.as_u16() {
        401 | 403 => "login-required",
        429 => "rate-limited",
        _ if status.is_server_error() => "network",
        _ => "unknown",
    };
    Err(ProviderSnapshot::unavailable(
        provider,
        display_name(provider),
        code,
        format!("{} request failed with HTTP {}", display_name(provider), status.as_u16()),
    ))
}

fn display_name(provider: &str) -> &'static str {
    match provider {
        "claude" => "Claude Code",
        "cursor" => "Cursor",
        _ => "Provider",
    }
}

fn collect_claude() -> ProviderSnapshot {
    if which::which("claude").is_err() {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "not-installed", "Claude Code CLI was not found");
    }
    let credential_text = security_password("Claude Code-credentials")
        .or_else(|| std::fs::read_to_string(home_dir().join(".claude/.credentials.json")).ok());
    let Some(credential_text) = credential_text else {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "login-required", "Claude Code OAuth credentials were not found");
    };
    let Ok(credentials) = serde_json::from_str::<Value>(&credential_text) else {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "schema-changed", "Claude Code credentials could not be parsed");
    };
    let Some(access_token) = find_string_recursive(&credentials, &["accessToken", "access_token"]) else {
        return ProviderSnapshot::unavailable("claude", "Claude Code", "login-required", "Claude Code OAuth token is unavailable");
    };
    let http = match client() {
        Ok(client) => client,
        Err(error) => return ProviderSnapshot::unavailable("claude", "Claude Code", "network", error),
    };
    let response = match http
        .get("https://api.anthropic.com/api/oauth/usage")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(ACCEPT, "application/json")
        .header("anthropic-beta", "oauth-2025-04-20")
        .header(USER_AGENT, "claude-code/2.1.197")
        .send()
    {
        Ok(response) => response,
        Err(error) => return ProviderSnapshot::unavailable("claude", "Claude Code", "network", error.to_string()),
    };
    match parse_response(response, "claude") {
        Ok(payload) => with_quota(base_snapshot("claude", "Claude Code"), parse_claude_quota(&payload)),
        Err(snapshot) => snapshot,
    }
}

fn cursor_state_db() -> Option<PathBuf> {
    let home = home_dir();
    [
        home.join("Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor Nightly/User/globalStorage/state.vscdb"),
    ]
    .into_iter()
    .filter(|path| path.exists())
    .max_by_key(|path| std::fs::metadata(path).and_then(|metadata| metadata.modified()).ok())
}

fn sqlite_value(path: &PathBuf, key: &str) -> Option<String> {
    let query = format!("SELECT value FROM ItemTable WHERE key='{}' LIMIT 1;", key.replace('\'', "''"));
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
    let http = match client() {
        Ok(client) => client,
        Err(error) => return ProviderSnapshot::unavailable("cursor", "Cursor", "network", error),
    };
    let response = match http
        .post("https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .header("Connect-Protocol-Version", "1")
        .json(&json!({}))
        .send()
    {
        Ok(response) => response,
        Err(error) => return ProviderSnapshot::unavailable("cursor", "Cursor", "network", error.to_string()),
    };
    match parse_response(response, "cursor") {
        Ok(payload) => with_quota(base_snapshot("cursor", "Cursor"), parse_cursor_quota(&payload)),
        Err(snapshot) => snapshot,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn never_treats_missing_token_as_cursor_quota() {
        let snapshot = with_quota(base_snapshot("cursor", "Cursor"), Vec::new());
        assert!(snapshot.quota.is_empty());
        assert_eq!(snapshot.freshness, "stale");
        assert_eq!(snapshot.issue.unwrap().code, "schema-changed");
    }
}
