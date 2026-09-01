use crate::models::{AgentSession, ProviderSnapshot};
use serde_json::Value;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

const CLAUDE_AGENTS_TIMEOUT: Duration = Duration::from_secs(3);

pub fn attach_sessions(snapshots: &mut [ProviderSnapshot]) {
    let mut seen = HashSet::new();

    // Claude Code exposes a scripting-oriented live-session view. Prefer it because
    // current native installers can execute version-named binaries that do not contain
    // the word `claude` in their process path. Process discovery below remains a
    // fallback for foreground sessions and versions where agent-view JSON is incomplete.
    for session in collect_claude_agent_sessions() {
        let key = format!("claude:id:{}", session.id);
        if seen.insert(key) {
            attach_session(snapshots, session);
        }
    }

    let Ok(output) = Command::new("/bin/ps").args(["-axo", "pid=,command="]).output() else {
        return;
    };
    let text = String::from_utf8_lossy(&output.stdout);

    for line in text.lines() {
        let trimmed = line.trim();
        let mut parts = trimmed.splitn(2, char::is_whitespace);
        let Some(pid_text) = parts.next().filter(|value| !value.is_empty()) else {
            continue;
        };
        let command = parts.next().unwrap_or("").trim();
        let lower = command.to_lowercase();
        let provider = if is_codex_process(&lower) {
            Some("codex")
        } else if is_claude_process(&lower) {
            Some("claude")
        } else if is_cursor_agent_process(&lower) {
            Some("cursor")
        } else if is_antigravity_agent_process(&lower) {
            Some("antigravity")
        } else {
            None
        };
        let Some(provider) = provider else {
            continue;
        };

        let pid = pid_text.parse::<u32>().ok();
        let project = infer_project(command).or_else(|| pid.and_then(process_cwd).and_then(project_name));
        let key = format!("{provider}:process:{}", project.as_deref().unwrap_or(pid_text));
        if !seen.insert(key.clone()) {
            continue;
        }

        attach_session(
            snapshots,
            AgentSession {
                id: format!("{key}:{pid_text}"),
                provider: provider.into(),
                project,
                status: "active".into(),
                started_at: None,
                last_activity_at: None,
            },
        );
    }
}

fn attach_session(snapshots: &mut [ProviderSnapshot], session: AgentSession) {
    let Some(snapshot) = snapshots.iter_mut().find(|snapshot| snapshot.provider == session.provider) else {
        return;
    };
    snapshot.capabilities.push("sessions".into());
    snapshot.capabilities.sort();
    snapshot.capabilities.dedup();
    snapshot.sessions.push(session);
}

fn collect_claude_agent_sessions() -> Vec<AgentSession> {
    let Some(binary) = claude_binary() else {
        return Vec::new();
    };
    let Some(output) = command_output_with_timeout(
        &binary,
        &["agents", "--json"],
        CLAUDE_AGENTS_TIMEOUT,
    ) else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    let Ok(payload) = serde_json::from_slice::<Value>(&output.stdout) else {
        return Vec::new();
    };
    parse_claude_agents_json(&payload)
}

fn parse_claude_agents_json(payload: &Value) -> Vec<AgentSession> {
    let Some(items) = payload.as_array() else {
        return Vec::new();
    };

    items
        .iter()
        .filter_map(|item| {
            let state = item
                .get("state")
                .or_else(|| item.get("status"))
                .and_then(Value::as_str)
                .unwrap_or("active")
                .to_ascii_lowercase();
            if is_terminal_claude_state(&state) {
                return None;
            }

            let id = item
                .get("id")
                .or_else(|| item.get("sessionId"))
                .or_else(|| item.get("session_id"))
                .and_then(value_as_string)
                .or_else(|| item.get("pid").and_then(value_as_string))?;
            let cwd = item.get("cwd").and_then(Value::as_str).map(PathBuf::from);
            let project = cwd.as_deref().and_then(project_name);
            let started_at = item
                .get("startedAt")
                .or_else(|| item.get("started_at"))
                .and_then(Value::as_str)
                .map(ToString::to_string);

            Some(AgentSession {
                id,
                provider: "claude".into(),
                project,
                status: "active".into(),
                started_at,
                last_activity_at: None,
            })
        })
        .collect()
}

fn value_as_string(value: &Value) -> Option<String> {
    match value {
        Value::String(value) if !value.trim().is_empty() => Some(value.clone()),
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    }
}

fn is_terminal_claude_state(state: &str) -> bool {
    matches!(state, "completed" | "complete" | "done" | "failed" | "stopped")
}

fn command_output_with_timeout(
    binary: &Path,
    args: &[&str],
    timeout: Duration,
) -> Option<std::process::Output> {
    let mut child = Command::new(binary)
        .args(args)
        .env("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1")
        .env("CLAUDE_CODE_DISABLE_TELEMETRY", "1")
        .env("DISABLE_AUTOUPDATER", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        match child.try_wait() {
            Ok(Some(_)) => return child.wait_with_output().ok(),
            Ok(None) => thread::sleep(Duration::from_millis(40)),
            Err(_) => return None,
        }
    }
    let _ = child.kill();
    let _ = child.wait();
    None
}

fn claude_binary() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CLAUDE_BINARY_PATH") {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Some(path);
        }
    }

    let home = std::env::var_os("HOME").map(PathBuf::from);
    let mut candidates = Vec::new();
    if let Some(home) = &home {
        candidates.push(home.join(".local/bin/claude"));
    }
    candidates.extend([
        PathBuf::from("/opt/homebrew/bin/claude"),
        PathBuf::from("/usr/local/bin/claude"),
    ]);
    candidates
        .into_iter()
        .find(|path| path.is_file())
        .or_else(|| which::which("claude").ok())
}

fn is_codex_process(command: &str) -> bool {
    let explicit_cli = command.starts_with("codex ")
        || command.contains("/bin/codex ")
        || command.contains("/resources/codex ");
    explicit_cli
        && !command.contains("app-server")
        && !command.contains("codex helper")
        && !command.contains("cyboard")
}

fn is_claude_process(command: &str) -> bool {
    let explicit_cli = command == "claude"
        || command.starts_with("claude ")
        || command.contains("/bin/claude")
        || command.contains("/claudecode.app/contents/macos/claude")
        || command.contains("/.local/share/claude/versions/");
    explicit_cli
        && !command.contains("claude helper")
        && !command.contains(" daemon run")
        && !command.contains(" agents --json")
        && !command.contains(" agents ")
        && !command.contains("--bg-pty-host")
        && !command.contains("--bg-spare")
        && !command.contains("cyboard")
}

fn is_cursor_agent_process(command: &str) -> bool {
    (command.contains("/cursor-agent ") || command.starts_with("cursor-agent ")) && !command.contains("cyboard")
}

fn is_antigravity_agent_process(command: &str) -> bool {
    let cli = command.starts_with("agy ")
        || command.contains("/bin/agy ")
        || command.starts_with("antigravity-cli ")
        || command.contains("/bin/antigravity-cli ");
    cli && !command.contains("language_server") && !command.contains("language-server") && !command.contains("cyboard")
}

fn process_cwd(pid: u32) -> Option<PathBuf> {
    let lsof = ["/usr/sbin/lsof", "/usr/bin/lsof"]
        .into_iter()
        .find(|path| Path::new(path).exists())?;
    let output = Command::new(lsof)
        .args(["-a", "-p", &pid.to_string(), "-d", "cwd", "-Fn"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .find_map(|line| line.strip_prefix('n').filter(|value| value.starts_with('/')))
        .map(PathBuf::from)
}

fn project_name(path: &Path) -> Option<String> {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|name| !name.is_empty())
        .map(ToString::to_string)
}

fn infer_project(command: &str) -> Option<String> {
    let candidates = command.split_whitespace().filter(|part| {
        part.starts_with('/')
            && !part.starts_with("/Applications/")
            && !part.starts_with("/usr/")
            && !part.starts_with("/opt/")
            && !part.contains("/.local/share/claude/versions/")
    });
    candidates
        .last()
        .and_then(|path| path.trim_end_matches('/').rsplit('/').next())
        .filter(|name| !name.is_empty())
        .map(ToString::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn excludes_codex_desktop_helpers_and_app_server() {
        assert!(!is_codex_process(
            "/Applications/Codex.app/Contents/Frameworks/Codex Helper (Renderer).app/Contents/MacOS/Codex Helper"
        ));
        assert!(!is_codex_process(
            "/Applications/Codex.app/Contents/Resources/codex app-server --stdio"
        ));
        assert!(is_codex_process("/opt/homebrew/bin/codex exec /Users/test/code/project"));
    }

    #[test]
    fn detects_native_version_named_claude_processes_without_counting_daemon_infrastructure() {
        assert!(is_claude_process(
            "/Users/test/.local/share/claude/versions/2.1.233 --resume abc"
        ));
        assert!(!is_claude_process(
            "/Users/test/.local/share/claude/versions/2.1.233 daemon run --origin transient"
        ));
        assert!(!is_claude_process(
            "/Users/test/.local/share/claude/versions/2.1.233 --bg-pty-host /tmp/pty.sock"
        ));
        assert!(!is_claude_process(
            "/Users/test/.local/bin/claude agents --json"
        ));
    }

    #[test]
    fn parses_live_claude_agent_view_sessions_and_skips_terminal_states() {
        let payload = json!([
            {
                "id": "worker-a",
                "state": "working",
                "cwd": "/Users/test/code/project-a",
                "startedAt": "2026-09-01T12:00:00Z"
            },
            {
                "sessionId": "worker-b",
                "state": "blocked",
                "cwd": "/Users/test/code/project-b"
            },
            {
                "id": "old-worker",
                "state": "stopped",
                "cwd": "/Users/test/code/project-c"
            }
        ]);
        let sessions = parse_claude_agents_json(&payload);
        assert_eq!(sessions.len(), 2);
        assert_eq!(sessions[0].id, "worker-a");
        assert_eq!(sessions[0].project.as_deref(), Some("project-a"));
        assert_eq!(sessions[0].status, "active");
        assert_eq!(sessions[1].id, "worker-b");
    }

    #[test]
    fn excludes_cursor_extension_hosts_from_agent_count() {
        assert!(!is_cursor_agent_process(
            "/applications/cursor.app/contents/frameworks/cursor helper (plugin).app extension-host"
        ));
        assert!(is_cursor_agent_process("/usr/local/bin/cursor-agent run"));
    }

    #[test]
    fn counts_antigravity_cli_but_not_language_server() {
        assert!(is_antigravity_agent_process("/opt/homebrew/bin/agy /Users/test/code/project"));
        assert!(!is_antigravity_agent_process(
            "/Applications/Antigravity.app/Contents/Resources/bin/language_server_macos_arm --app_data_dir antigravity"
        ));
    }

    #[test]
    fn infers_project_from_absolute_path() {
        assert_eq!(
            infer_project("codex exec /Users/test/code/cyboard-punk"),
            Some("cyboard-punk".into())
        );
    }
}
