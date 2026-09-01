use crate::models::{ProviderIssue, ProviderSnapshot};
use crate::parsers::{find_string_recursive, parse_claude_quota, parse_codex_quota, parse_cursor_quota};
use base64::{
    engine::general_purpose::{URL_SAFE, URL_SAFE_NO_PAD},
    Engine as _,
};
use chrono::Utc;
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, COOKIE, USER_AGENT};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{ChildStdout, Command, Stdio};
use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::{Duration, UNIX_EPOCH};

const NETWORK_TIMEOUT: Duration = Duration::from_secs(15);
const CODEX_RPC_TIMEOUT: Duration = Duration::from_secs(12);
const CODEX_USAGE_URL: &str = "https://chatgpt.com/backend-api/wham/usage";
const CLAUDE_USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const CURSOR_USAGE_URL: &str = "https://cursor.com/api/usage-summary";

pub fn collect_all() -> Vec<ProviderSnapshot> {
    let codex = thread::spawn(collect_codex);
    let claude = thread::spawn(collect_claude);
    let cursor = thread::spawn(collect_cursor);
    vec![
        codex.join().unwrap_or_else(|_| {
            ProviderSnapshot::unavailable("codex", "Codex", "unknown", "Codex provider worker failed")
        }),
        claude.join().unwrap_or_else(|_| {
            ProviderSnapshot::unavailable("claude", "Claude Code", "unknown", "Claude provider worker failed")
        }),
        cursor.join().unwrap_or_else(|_| {
            ProviderSnapshot::unavailable("cursor", "Cursor", "unknown", "Cursor provider worker failed")
        }),
    ]
}

fn base_snapshot(provider: &str, display_name: &str) -> ProviderSnapshot {
    ProviderSnapshot {
        provider: provider.into(),
        display_name: display_name.into(),
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

fn home_dir() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("~"))
}

fn codex_home() -> PathBuf {
    std::env::var_os("CODEX_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| home_dir().join(".codex"))
}

fn codex_oauth_credentials() -> Option<(String, Option<String>)> {
    let text = std::fs::read_to_string(codex_home().join("auth.json")).ok()?;
    let value = serde_json::from_str::<Value>(&text).ok()?;
    let access_token = value
        .pointer("/tokens/access_token")
        .and_then(Value::as_str)
        .filter(|token| !token.trim().is_empty())
        .map(ToString::to_string)
        .or_else(|| find_string_recursive(&value, &["access_token", "accessToken"]))?;
    let account_id = value
        .pointer("/tokens/account_id")
        .and_then(Value::as_str)
        .filter(|account| !account.trim().is_empty())
        .map(ToString::to_string)
        .or_else(|| find_string_recursive(&value, &["account_id", "accountId", "chatgpt_account_id"]));
    Some((access_token, account_id))
}

fn codex_binary() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CODEX_BINARY_PATH") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }

    let home = home_dir();
    let candidates = [
        codex_home().join("packages/standalone/current/codex"),
        PathBuf::from("/Applications/Codex.app/Contents/Resources/codex"),
        PathBuf::from("/Applications/ChatGPT.app/Contents/Resources/codex"),
        home.join("Applications/Codex.app/Contents/Resources/codex"),
        home.join("Applications/ChatGPT.app/Contents/Resources/codex"),
    ];
    if let Some(path) = candidates.into_iter().find(|path| path.exists()) {
        return Some(path);
    }
    which::which("codex").ok()
}

fn fetch_codex_oauth(access_token: &str, account_id: Option<&str>) -> Result<ProviderSnapshot, ProviderSnapshot> {
    let http = client().map_err(|error| ProviderSnapshot::unavailable("codex", "Codex", "network", error))?;
    let mut request = http
        .get(CODEX_USAGE_URL)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "codex-cli");
    if let Some(account_id) = account_id {
        request = request.header("ChatGPT-Account-Id", account_id);
    }
    let response = request
        .send()
        .map_err(|error| ProviderSnapshot::unavailable("codex", "Codex", "network", error.to_string()))?;
    let payload = parse_response(response, "codex")?;
    Ok(with_quota(
        base_snapshot("codex", "Codex"),
        parse_codex_quota(&payload),
    ))
}

fn spawn_rpc_reader(stdout: ChildStdout) -> Receiver<Value> {
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            if sender.send(value).is_err() {
                break;
            }
        }
    });
    receiver
}

fn wait_for_rpc(receiver: &Receiver<Value>, id: i64) -> Result<Value, String> {
    loop {
        let value = receiver
            .recv_timeout(CODEX_RPC_TIMEOUT)
            .map_err(|_| "Codex app-server timed out".to_string())?;
        if value.get("id").and_then(Value::as_i64) != Some(id) {
            continue;
        }
        if let Some(error) = value.get("error") {
            return Err(format!("Codex RPC error: {error}"));
        }
        return Ok(value.get("result").cloned().unwrap_or(Value::Null));
    }
}

fn collect_codex_app_server(binary: PathBuf) -> ProviderSnapshot {
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
        return ProviderSnapshot::unavailable(
            "codex",
            "Codex",
            "unknown",
            "Unable to open Codex app-server stdin",
        );
    };
    let Some(stdout) = child.stdout.take() else {
        let _ = child.kill();
        return ProviderSnapshot::unavailable(
            "codex",
            "Codex",
            "unknown",
            "Unable to open Codex app-server stdout",
        );
    };
    let receiver = spawn_rpc_reader(stdout);

    let initialize = json!({
        "jsonrpc":"2.0",
        "id":1,
        "method":"initialize",
        "params":{"clientInfo":{"name":"cyboard","version":"0.1.0"},"capabilities":{"experimentalApi":true}}
    });
    if writeln!(stdin, "{initialize}").is_err() || stdin.flush().is_err() {
        let _ = child.kill();
        return ProviderSnapshot::unavailable(
            "codex",
            "Codex",
            "unknown",
            "Unable to initialize Codex app-server",
        );
    }
    if let Err(error) = wait_for_rpc(&receiver, 1) {
        let _ = child.kill();
        let _ = child.wait();
        return ProviderSnapshot::unavailable("codex", "Codex", "login-required", error);
    }
    let _ = writeln!(
        stdin,
        "{}",
        json!({"jsonrpc":"2.0","method":"initialized","params":{}})
    );
    let _ = writeln!(
        stdin,
        "{}",
        json!({"jsonrpc":"2.0","id":2,"method":"account/rateLimits/read","params":{}})
    );
    let _ = stdin.flush();
    let result = wait_for_rpc(&receiver, 2);
    let _ = child.kill();
    let _ = child.wait();

    match result {
        Ok(result) => with_quota(base_snapshot("codex", "Codex"), parse_codex_quota(&result)),
        Err(error) => ProviderSnapshot::unavailable("codex", "Codex", "network", error),
    }
}

fn collect_codex() -> ProviderSnapshot {
    let mut oauth_failure = None;
    if let Some((access_token, account_id)) = codex_oauth_credentials() {
        match fetch_codex_oauth(&access_token, account_id.as_deref()) {
            Ok(snapshot) => return snapshot,
            Err(snapshot) => oauth_failure = Some(snapshot),
        }
    }

    if let Some(binary) = codex_binary() {
        let snapshot = collect_codex_app_server(binary);
        if snapshot.freshness == "fresh" && !snapshot.quota.is_empty() {
            return snapshot;
        }
        if oauth_failure.is_none() {
            return snapshot;
        }
    }

    oauth_failure.unwrap_or_else(|| {
        ProviderSnapshot::unavailable(
            "codex",
            "Codex",
            "not-installed",
            "Codex credentials, CLI, and desktop runtime were not found",
        )
    })
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
        .build()
        .map_err(|error| error.to_string())
}

fn retry_after_iso(response: &Response) -> Option<String> {
    let raw = response.headers().get("Retry-After")?.to_str().ok()?.trim();
    if let Ok(seconds) = raw.parse::<i64>() {
        return Utc::now()
            .checked_add_signed(chrono::Duration::seconds(seconds.max(0)))
            .map(|date| date.to_rfc3339());
    }
    chrono::DateTime::parse_from_rfc2822(raw)
        .ok()
        .map(|date| date.with_timezone(&Utc).to_rfc3339())
}

fn parse_response(response: Response, provider: &str) -> Result<Value, ProviderSnapshot> {
    let status = response.status();
    if status.is_success() {
        return response.json::<Value>().map_err(|error| {
            ProviderSnapshot::unavailable(provider, display_name(provider), "schema-changed", error.to_string())
        });
    }

    let retry_at = if status.as_u16() == 429 {
        retry_after_iso(&response)
    } else {
        None
    };
    let code = match status.as_u16() {
        401 | 403 => "login-required",
        429 => "rate-limited",
        _ if status.is_server_error() => "network",
        _ => "unknown",
    };
    let message = if status.as_u16() == 429 {
        format!("{} usage endpoint is rate limited; retry after the cooldown", display_name(provider))
    } else {
        format!("{} request failed with HTTP {}", display_name(provider), status.as_u16())
    };
    let mut snapshot = ProviderSnapshot::unavailable(provider, display_name(provider), code, message);
    if let Some(issue) = snapshot.issue.as_mut() {
        issue.retry_at = retry_at;
    }
    Err(snapshot)
}

fn display_name(provider: &str) -> &'static str {
    match provider {
        "codex" => "Codex",
        "claude" => "Claude Code",
        "cursor" => "Cursor",
        _ => "Provider",
    }
}

fn claude_access_token(credentials: &Value) -> Option<String> {
    let oauth = credentials.get("claudeAiOauth")?;
    oauth
        .get("accessToken")
        .or_else(|| oauth.get("access_token"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToString::to_string)
}

fn claude_has_usage_scope(credentials: &Value) -> bool {
    let Some(scopes) = credentials
        .get("claudeAiOauth")
        .and_then(|oauth| oauth.get("scopes"))
        .and_then(Value::as_array)
    else {
        return true;
    };
    scopes
        .iter()
        .filter_map(Value::as_str)
        .any(|scope| scope == "user:profile")
}

fn claude_cli_version() -> Option<String> {
    let binary = which::which("claude").ok()?;
    let output = Command::new(binary).arg("--version").output().ok()?;
    let text = if output.stdout.is_empty() {
        String::from_utf8(output.stderr).ok()?
    } else {
        String::from_utf8(output.stdout).ok()?
    };
    text.split_whitespace()
        .next()
        .map(str::trim)
        .filter(|version| !version.is_empty())
        .map(ToString::to_string)
}

fn collect_claude() -> ProviderSnapshot {
    if which::which("claude").is_err() {
        return ProviderSnapshot::unavailable(
            "claude",
            "Claude Code",
            "not-installed",
            "Claude Code CLI was not found",
        );
    }
    let credential_text = security_password("Claude Code-credentials")
        .or_else(|| std::fs::read_to_string(home_dir().join(".claude/.credentials.json")).ok());
    let Some(credential_text) = credential_text else {
        return ProviderSnapshot::unavailable(
            "claude",
            "Claude Code",
            "login-required",
            "Claude Code OAuth credentials were not found",
        );
    };
    let Ok(credentials) = serde_json::from_str::<Value>(&credential_text) else {
        return ProviderSnapshot::unavailable(
            "claude",
            "Claude Code",
            "schema-changed",
            "Claude Code credentials could not be parsed",
        );
    };
    let Some(access_token) = claude_access_token(&credentials) else {
        return ProviderSnapshot::unavailable(
            "claude",
            "Claude Code",
            "login-required",
            "Claude Code credentials do not contain claudeAiOauth; run `claude` and sign in again",
        );
    };
    if !claude_has_usage_scope(&credentials) {
        return ProviderSnapshot::unavailable(
            "claude",
            "Claude Code",
            "login-required",
            "Claude Code OAuth token is missing the user:profile scope; sign in again",
        );
    }

    let http = match client() {
        Ok(client) => client,
        Err(error) => return ProviderSnapshot::unavailable("claude", "Claude Code", "network", error),
    };
    let user_agent = format!(
        "claude-code/{}",
        claude_cli_version().unwrap_or_else(|| "2.1.0".into())
    );
    let response = match http
        .get(CLAUDE_USAGE_URL)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(ACCEPT, "application/json")
        .header(CONTENT_TYPE, "application/json")
        .header("anthropic-beta", "oauth-2025-04-20")
        .header(USER_AGENT, user_agent)
        .send()
    {
        Ok(response) => response,
        Err(error) => {
            return ProviderSnapshot::unavailable("claude", "Claude Code", "network", error.to_string())
        }
    };
    match parse_response(response, "claude") {
        Ok(payload) => with_quota(base_snapshot("claude", "Claude Code"), parse_claude_quota(&payload)),
        Err(snapshot) => snapshot,
    }
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
    let home = home_dir();
    [
        home.join("Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb"),
        home.join("Library/Application Support/Cursor Nightly/User/globalStorage/state.vscdb"),
    ]
    .into_iter()
    .filter(|path| path.exists())
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
    if text.starts_with('"') {
        serde_json::from_str::<String>(&text).ok()
    } else if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn cursor_jwt_payload(access_token: &str) -> Option<Value> {
    let payload = access_token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD
        .decode(payload)
        .or_else(|_| URL_SAFE.decode(payload))
        .ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn cursor_user_id(access_token: &str) -> Option<String> {
    let payload = cursor_jwt_payload(access_token)?;
    let subject = payload.get("sub")?.as_str()?;
    let user_id = subject.rsplit('|').next()?.trim();
    if user_id.is_empty()
        || !user_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-'))
    {
        return None;
    }
    Some(user_id.to_string())
}

fn cursor_cookie_header(access_token: &str) -> Option<String> {
    let user_id = cursor_user_id(access_token)?;
    Some(format!(
        "WorkosCursorSessionToken={user_id}%3A%3A{access_token}"
    ))
}

fn collect_cursor() -> ProviderSnapshot {
    let Some(state) = cursor_state_db() else {
        return ProviderSnapshot::unavailable(
            "cursor",
            "Cursor",
            "not-installed",
            "Cursor local state database was not found",
        );
    };
    let Some(access_token) = sqlite_value(&state, "cursorAuth/accessToken") else {
        return ProviderSnapshot::unavailable("cursor", "Cursor", "login-required", "Cursor is not signed in");
    };
    let Some(cookie) = cursor_cookie_header(&access_token) else {
        return ProviderSnapshot::unavailable(
            "cursor",
            "Cursor",
            "login-required",
            "Cursor local session token is not a usable JWT; sign in to Cursor again",
        );
    };
    let http = match client() {
        Ok(client) => client,
        Err(error) => return ProviderSnapshot::unavailable("cursor", "Cursor", "network", error),
    };
    let response = match http
        .get(CURSOR_USAGE_URL)
        .header(COOKIE, cookie)
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "CYBOARD/0.1.0")
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
    use std::sync::mpsc;

    #[test]
    fn rpc_wait_ignores_unrelated_notifications() {
        let (sender, receiver) = mpsc::channel();
        sender
            .send(json!({"method":"account/rateLimits/updated"}))
            .unwrap();
        sender
            .send(json!({"id":2,"result":{"ok":true}}))
            .unwrap();
        assert_eq!(wait_for_rpc(&receiver, 2).unwrap(), json!({"ok":true}));
    }

    #[test]
    fn never_treats_empty_payload_as_valid_quota() {
        let snapshot = with_quota(base_snapshot("cursor", "Cursor"), Vec::new());
        assert!(snapshot.quota.is_empty());
        assert_eq!(snapshot.freshness, "stale");
        assert_eq!(snapshot.issue.unwrap().code, "schema-changed");
    }

    #[test]
    fn missing_cursor_state_has_zero_sort_key() {
        let path = PathBuf::from("/path/that/does/not/exist/state.vscdb");
        assert_eq!(modified_sort_key(&path), 0);
    }

    #[test]
    fn cursor_app_token_becomes_workos_cookie() {
        let payload = URL_SAFE_NO_PAD.encode(br#"{"sub":"auth0|user-123"}"#);
        let token = format!("header.{payload}.signature");
        assert_eq!(cursor_user_id(&token).as_deref(), Some("user-123"));
        let expected = format!("WorkosCursorSessionToken=user-123%3A%3A{token}");
        assert_eq!(cursor_cookie_header(&token).as_deref(), Some(expected.as_str()));
    }

    #[test]
    fn claude_oauth_selection_ignores_mcp_tokens() {
        let credentials = json!({
            "mcpOAuth":{"accessToken":"wrong-token"},
            "claudeAiOauth":{"accessToken":"right-token","scopes":["user:profile"]}
        });
        assert_eq!(claude_access_token(&credentials).as_deref(), Some("right-token"));
        assert!(claude_has_usage_scope(&credentials));
    }
}
