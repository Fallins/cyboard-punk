use crate::models::{ProviderIssue, ProviderSnapshot, QuotaWindow};
use crate::parsers::parse_claude_quota;
use chrono::{DateTime, Utc};
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const CACHE_TTL: Duration = Duration::from_secs(10 * 60);
const STALE_CACHE_MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);
const CLI_USAGE_TIMEOUT: Duration = Duration::from_secs(14);

#[derive(Debug)]
struct FetchFailure {
    code: &'static str,
    message: String,
    retry_at: Option<String>,
}

pub fn collect() -> ProviderSnapshot {
    let Some(binary) = claude_binary() else {
        return unavailable("not-installed", "Claude Code CLI was not found");
    };

    if let Some(snapshot) = cached_snapshot(CACHE_TTL, "fresh", None) {
        return snapshot;
    }

    let oauth_failure = match read_credentials() {
        Some(credentials) => match fetch_oauth_usage(&credentials) {
            Ok(payload) => {
                let quota = parse_claude_quota(&payload);
                if !quota.is_empty() {
                    persist_api_payload(&payload);
                    return snapshot_with_quota(quota, "fresh", None);
                }
                Some(FetchFailure {
                    code: "schema-changed",
                    message: "Claude OAuth usage returned no recognized quota windows".into(),
                    retry_at: None,
                })
            }
            Err(error) => Some(error),
        },
        None => Some(FetchFailure {
            code: "login-required",
            message: "Claude OAuth credentials were not readable; falling back to Claude CLI usage".into(),
            retry_at: None,
        }),
    };

    if claude_auth_status(&binary) == Some(false) {
        return unavailable("login-required", "Claude Code is signed out; run `claude` and sign in again");
    }

    match capture_cli_panel(&binary, "/usage", CLI_USAGE_TIMEOUT).and_then(|output| {
        let quota = parse_cli_usage(&output);
        if quota.is_empty() {
            Err("Claude CLI /usage rendered no recognized session or weekly quota".into())
        } else {
            Ok(quota)
        }
    }) {
        Ok(quota) => {
            persist_normalized_quota(&quota);
            snapshot_with_quota(quota, "fresh", None)
        }
        Err(cli_error) => {
            let issue = oauth_failure.unwrap_or(FetchFailure {
                code: "unknown",
                message: "Claude quota sources were unavailable".into(),
                retry_at: None,
            });
            let message = format!("{} · CLI fallback: {}", issue.message, cli_error);
            let merged_issue = ProviderIssue {
                code: issue.code.into(),
                message,
                retry_at: issue.retry_at,
            };
            cached_snapshot(STALE_CACHE_MAX_AGE, "stale", Some(merged_issue.clone())).unwrap_or_else(|| {
                let mut snapshot = unavailable(&merged_issue.code, merged_issue.message.clone());
                snapshot.issue = Some(merged_issue);
                snapshot
            })
        }
    }
}

fn base_snapshot() -> ProviderSnapshot {
    ProviderSnapshot {
        provider: "claude".into(),
        display_name: "Claude Code".into(),
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

fn snapshot_with_quota(quota: Vec<QuotaWindow>, freshness: &str, issue: Option<ProviderIssue>) -> ProviderSnapshot {
    let mut snapshot = base_snapshot();
    snapshot.quota = quota;
    snapshot.freshness = freshness.into();
    snapshot.issue = issue;
    if !snapshot.quota.is_empty() {
        snapshot.capabilities.push("quota".into());
    }
    snapshot
}

fn home_dir() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("~"))
}

fn claude_binary() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CLAUDE_BINARY_PATH") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Some(path);
        }
    }
    which::which("claude").ok()
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

fn read_credentials() -> Option<Value> {
    let text = security_password("Claude Code-credentials")
        .or_else(|| std::fs::read_to_string(home_dir().join(".claude/.credentials.json")).ok())?;
    serde_json::from_str(&text).ok()
}

fn access_token(credentials: &Value) -> Option<&str> {
    credentials
        .get("claudeAiOauth")?
        .get("accessToken")
        .or_else(|| credentials.get("claudeAiOauth")?.get("access_token"))?
        .as_str()
        .map(str::trim)
        .filter(|token| !token.is_empty())
}

fn has_usage_scope(credentials: &Value) -> bool {
    let Some(scopes) = credentials
        .get("claudeAiOauth")
        .and_then(|oauth| oauth.get("scopes"))
        .and_then(Value::as_array)
    else {
        return true;
    };
    scopes.iter().filter_map(Value::as_str).any(|scope| scope == "user:profile")
}

fn cli_version(binary: &Path) -> String {
    Command::new(binary)
        .arg("--version")
        .output()
        .ok()
        .and_then(|output| {
            let bytes = if output.stdout.is_empty() { output.stderr } else { output.stdout };
            String::from_utf8(bytes).ok()
        })
        .and_then(|text| text.split_whitespace().next().map(ToString::to_string))
        .unwrap_or_else(|| "2.1.0".into())
}

fn http_client() -> Result<Client, FetchFailure> {
    Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(8))
        .build()
        .map_err(|error| FetchFailure {
            code: "network",
            message: error.to_string(),
            retry_at: None,
        })
}

fn fetch_oauth_usage(credentials: &Value) -> Result<Value, FetchFailure> {
    let token = access_token(credentials).ok_or_else(|| FetchFailure {
        code: "login-required",
        message: "Claude credentials do not contain claudeAiOauth.accessToken".into(),
        retry_at: None,
    })?;
    if !has_usage_scope(credentials) {
        return Err(FetchFailure {
            code: "login-required",
            message: "Claude OAuth token is missing the user:profile scope".into(),
            retry_at: None,
        });
    }

    let binary = claude_binary();
    let user_agent = binary
        .as_deref()
        .map(cli_version)
        .map(|version| format!("claude-code/{version}"))
        .unwrap_or_else(|| "claude-code/2.1.0".into());
    let response = http_client()?
        .get(USAGE_URL)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(ACCEPT, "application/json")
        .header(CONTENT_TYPE, "application/json")
        .header("anthropic-beta", "oauth-2025-04-20")
        .header(USER_AGENT, user_agent)
        .send()
        .map_err(|error| FetchFailure {
            code: "network",
            message: format!("Claude OAuth usage request failed: {error}"),
            retry_at: None,
        })?;
    parse_response(response)
}

fn parse_response(response: Response) -> Result<Value, FetchFailure> {
    let status = response.status();
    if status.is_success() {
        return response.json::<Value>().map_err(|error| FetchFailure {
            code: "schema-changed",
            message: format!("Claude OAuth usage response could not be parsed: {error}"),
            retry_at: None,
        });
    }

    let retry_at = if status.as_u16() == 429 {
        retry_after(&response)
    } else {
        None
    };
    let (code, message) = match status.as_u16() {
        401 => ("login-required", "Claude OAuth access token was rejected (HTTP 401); trying Claude CLI usage".into()),
        403 => ("login-required", "Claude OAuth access token cannot read usage (HTTP 403); trying Claude CLI usage".into()),
        429 => ("rate-limited", "Claude OAuth usage is rate limited; trying Claude CLI usage".into()),
        value if status.is_server_error() => ("network", format!("Claude usage service returned HTTP {value}")),
        value => ("unknown", format!("Claude OAuth usage request returned HTTP {value}")),
    };
    Err(FetchFailure { code, message, retry_at })
}

fn retry_after(response: &Response) -> Option<String> {
    let raw = response.headers().get("Retry-After")?.to_str().ok()?.trim();
    if let Ok(seconds) = raw.parse::<i64>() {
        return Some((Utc::now() + chrono::Duration::seconds(seconds.max(0))).to_rfc3339());
    }
    DateTime::parse_from_rfc2822(raw)
        .ok()
        .map(|date| date.with_timezone(&Utc).to_rfc3339())
}

fn claude_auth_status(binary: &Path) -> Option<bool> {
    let output = Command::new(binary)
        .args(["auth", "status", "--json"])
        .env("DISABLE_AUTOUPDATER", "1")
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("ANTHROPIC_AUTH_TOKEN")
        .env_remove("CLAUDE_CODE_OAUTH_TOKEN")
        .output()
        .ok()?;
    let value = serde_json::from_slice::<Value>(&output.stdout).ok()?;
    value
        .get("loggedIn")
        .or_else(|| value.get("logged_in"))
        .and_then(Value::as_bool)
}

fn probe_directory() -> PathBuf {
    home_dir().join("Library/Application Support/CYBOARD/ClaudeProbe")
}

fn capture_cli_panel(binary: &Path, subcommand: &str, timeout: Duration) -> Result<String, String> {
    let script = Path::new("/usr/bin/script");
    if !script.exists() {
        return Err("macOS PTY helper /usr/bin/script was not found".into());
    }
    let probe_dir = probe_directory();
    std::fs::create_dir_all(&probe_dir).map_err(|error| format!("Unable to create Claude probe directory: {error}"))?;

    let mut child = Command::new(script)
        .args(["-q", "/dev/null"])
        .arg(binary)
        .arg(subcommand)
        .args(["--allowed-tools", "", "--strict-mcp-config"])
        .env("DISABLE_AUTOUPDATER", "1")
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("ANTHROPIC_AUTH_TOKEN")
        .env_remove("CLAUDE_CODE_OAUTH_TOKEN")
        .current_dir(&probe_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Unable to start Claude CLI PTY probe: {error}"))?;

    let output = Arc::new(Mutex::new(Vec::<u8>::new()));
    let mut readers = Vec::new();
    if let Some(mut stdout) = child.stdout.take() {
        let buffer = Arc::clone(&output);
        readers.push(thread::spawn(move || copy_stream(&mut stdout, &buffer)));
    }
    if let Some(mut stderr) = child.stderr.take() {
        let buffer = Arc::clone(&output);
        readers.push(thread::spawn(move || copy_stream(&mut stderr, &buffer)));
    }

    let mut stdin = child.stdin.take();
    let start = Instant::now();
    let mut sent_enter = false;
    let mut settled_since = None;
    loop {
        if !sent_enter && start.elapsed() >= Duration::from_millis(1400) {
            if let Some(writer) = stdin.as_mut() {
                let _ = writer.write_all(b"\r");
                let _ = writer.flush();
            }
            sent_enter = true;
        }

        let text = output
            .lock()
            .map(|bytes| String::from_utf8_lossy(&bytes).into_owned())
            .unwrap_or_default();
        let looks_ready = text.contains("Current session") && text.contains('%');
        if looks_ready {
            let since = settled_since.get_or_insert_with(Instant::now);
            if since.elapsed() >= Duration::from_millis(900) {
                break;
            }
        }
        if text.contains("not logged in") || text.contains("authentication") && text.contains("failed") {
            break;
        }
        if child.try_wait().map_err(|error| error.to_string())?.is_some() || start.elapsed() >= timeout {
            break;
        }
        thread::sleep(Duration::from_millis(120));
    }

    drop(stdin.take());
    let _ = child.kill();
    let _ = child.wait();
    for reader in readers {
        let _ = reader.join();
    }

    let bytes = output.lock().map(|bytes| bytes.clone()).unwrap_or_default();
    let text = strip_terminal_controls(&String::from_utf8_lossy(&bytes));
    if text.trim().is_empty() {
        Err("Claude CLI PTY probe produced no output".into())
    } else if text.to_ascii_lowercase().contains("not logged in") {
        Err("Claude CLI reports that the account is signed out".into())
    } else {
        Ok(text)
    }
}

fn copy_stream(reader: &mut dyn Read, output: &Arc<Mutex<Vec<u8>>>) {
    let mut chunk = [0u8; 4096];
    loop {
        let Ok(read) = reader.read(&mut chunk) else {
            break;
        };
        if read == 0 {
            break;
        }
        if let Ok(mut target) = output.lock() {
            if target.len() < 256 * 1024 {
                let remaining = 256 * 1024 - target.len();
                target.extend_from_slice(&chunk[..read.min(remaining)]);
            }
        }
    }
}

fn strip_terminal_controls(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(character) = chars.next() {
        if character == '\u{1b}' {
            match chars.peek().copied() {
                Some('[') => {
                    let _ = chars.next();
                    for next in chars.by_ref() {
                        if ('@'..='~').contains(&next) {
                            break;
                        }
                    }
                }
                Some(']') => {
                    let _ = chars.next();
                    while let Some(next) = chars.next() {
                        if next == '\u{7}' {
                            break;
                        }
                        if next == '\u{1b}' && chars.peek() == Some(&'\\') {
                            let _ = chars.next();
                            break;
                        }
                    }
                }
                _ => {}
            }
            continue;
        }
        match character {
            '\r' => output.push('\n'),
            value if value.is_control() && value != '\n' && value != '\t' => output.push(' '),
            value => output.push(value),
        }
    }
    output
}

fn parse_cli_usage(text: &str) -> Vec<QuotaWindow> {
    let mut quota = Vec::new();
    if let Some(used) = percent_near_label(text, "Current session") {
        quota.push(QuotaWindow {
            id: "five-hour".into(),
            label: "5h".into(),
            used_percent: used,
            reset_at: None,
        });
    }
    let weekly = percent_near_label(text, "Current week (all models)")
        .or_else(|| percent_near_label(text, "Current week"));
    if let Some(used) = weekly {
        quota.push(QuotaWindow {
            id: "weekly".into(),
            label: "7d".into(),
            used_percent: used,
            reset_at: None,
        });
    }
    quota
}

fn percent_near_label(text: &str, label: &str) -> Option<f64> {
    let lower = text.to_ascii_lowercase();
    let index = lower.rfind(&label.to_ascii_lowercase())?;
    let tail = text.get(index..)?;
    let sample = tail.chars().take(700).collect::<String>();
    let sample_lower = sample.to_ascii_lowercase();

    for token in sample.split_whitespace() {
        let Some(percent_index) = token.find('%') else {
            continue;
        };
        let before = &token[..percent_index];
        let numeric_reversed = before
            .chars()
            .rev()
            .take_while(|character| character.is_ascii_digit() || *character == '.')
            .collect::<String>();
        if numeric_reversed.is_empty() {
            continue;
        }
        let numeric = numeric_reversed.chars().rev().collect::<String>();
        let Ok(percent) = numeric.parse::<f64>() else {
            continue;
        };
        let used = if sample_lower.contains("% left") || sample_lower.contains("percent left") {
            100.0 - percent
        } else {
            percent
        };
        return Some(used.clamp(0.0, 100.0));
    }
    None
}

fn cache_path() -> PathBuf {
    home_dir().join(".claude/cyboard-usage-cache.json")
}

fn cache_value() -> Option<Value> {
    let text = std::fs::read_to_string(cache_path()).ok()?;
    serde_json::from_str(&text).ok()
}

fn cache_age(cache: &Value) -> Option<Duration> {
    let fetched = DateTime::parse_from_rfc3339(cache.get("fetched_at")?.as_str()?).ok()?.with_timezone(&Utc);
    let seconds = Utc::now().signed_duration_since(fetched).num_seconds();
    (seconds >= 0).then(|| Duration::from_secs(seconds as u64))
}

fn cached_snapshot(max_age: Duration, freshness: &str, issue: Option<ProviderIssue>) -> Option<ProviderSnapshot> {
    let cache = cache_value()?;
    if cache_age(&cache)? > max_age {
        return None;
    }
    let quota = parse_claude_quota(cache.get("payload")?);
    if quota.is_empty() {
        return None;
    }
    let mut snapshot = snapshot_with_quota(quota, freshness, issue);
    if let Some(fetched_at) = cache.get("fetched_at").and_then(Value::as_str) {
        snapshot.updated_at = fetched_at.to_string();
    }
    Some(snapshot)
}

fn persist_api_payload(payload: &Value) {
    write_cache(&json!({
        "fetched_at": Utc::now().to_rfc3339(),
        "payload": payload,
    }));
}

fn persist_normalized_quota(quota: &[QuotaWindow]) {
    let five_hour = quota.iter().find(|window| window.label == "5h");
    let seven_day = quota.iter().find(|window| window.label == "7d");
    let payload = json!({
        "five_hour": five_hour.map(|window| json!({
            "utilization": window.used_percent,
            "resets_at": window.reset_at.clone(),
        })),
        "seven_day": seven_day.map(|window| json!({
            "utilization": window.used_percent,
            "resets_at": window.reset_at.clone(),
        })),
    });
    persist_api_payload(&payload);
}

fn write_cache(value: &Value) {
    let path = cache_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(bytes) = serde_json::to_vec(value) {
        let _ = std::fs::write(path, bytes);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_claude_cli_used_percentages() {
        let quota = parse_cli_usage(
            "Current session\n10% used\n\nCurrent week (all models)\n24% used\n",
        );
        assert_eq!(quota.len(), 2);
        assert_eq!(quota[0].label, "5h");
        assert_eq!(quota[0].used_percent, 10.0);
        assert_eq!(quota[1].label, "7d");
        assert_eq!(quota[1].used_percent, 24.0);
    }

    #[test]
    fn parses_claude_cli_left_percentages() {
        let quota = parse_cli_usage(
            "Current session\n80% left\n\nCurrent week (all models)\n55% left\n",
        );
        assert_eq!(quota[0].used_percent, 20.0);
        assert_eq!(quota[1].used_percent, 45.0);
    }

    #[test]
    fn strips_ansi_without_losing_usage_text() {
        let clean = strip_terminal_controls("\u{1b}[31mCurrent session\u{1b}[0m\r10% used");
        assert!(clean.contains("Current session"));
        assert!(clean.contains("10% used"));
    }
}
