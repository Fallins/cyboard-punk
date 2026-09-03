use crate::models::{AgentSession, ProviderSnapshot};
use serde_json::Value;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

const CLAUDE_AGENTS_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Debug)]
struct DetectedClaudeSession {
    session: AgentSession,
    pid: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ProcessSessionKind {
    CodexCli,
    CodexDesktop,
    Claude,
    CursorAgent,
    CursorDesktop,
}

impl ProcessSessionKind {
    fn provider(self) -> &'static str {
        match self {
            Self::CodexCli | Self::CodexDesktop => "codex",
            Self::Claude => "claude",
            Self::CursorAgent | Self::CursorDesktop => "cursor",
        }
    }
}

pub fn attach_sessions(snapshots: &mut [ProviderSnapshot]) {
    let mut seen = HashSet::new();
    let mut claude_agent_pids = HashSet::new();

    // Claude Code exposes a scripting-oriented live-session view. Prefer it because
    // native installers can execute version-named binaries that do not contain the
    // word `claude` in their process path. Process discovery below remains a fallback
    // for foreground sessions and versions where the agent view is incomplete.
    for detected in collect_claude_agent_sessions() {
        if let Some(pid) = detected.pid {
            claude_agent_pids.insert(pid);
        }
        let key = format!("claude:id:{}", detected.session.id);
        if seen.insert(key) {
            attach_session(snapshots, detected.session);
        }
    }

    let Ok(output) = Command::new("/bin/ps")
        .args(["-axo", "pid=,command="])
        .output()
    else {
        return;
    };
    mark_sessions_observed(snapshots);
    let text = String::from_utf8_lossy(&output.stdout);
    let processes = text
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            let mut parts = trimmed.splitn(2, char::is_whitespace);
            let pid_text = parts.next().filter(|value| !value.is_empty())?;
            let command = parts.next().unwrap_or("").trim();
            Some((pid_text.to_string(), command.to_string(), command.to_lowercase()))
        })
        .collect::<Vec<_>>();

    // CLI/agent processes carry stronger session evidence. Desktop main processes are
    // only fallbacks so one provider is not double-counted when both representations exist.
    let codex_cli_present = processes
        .iter()
        .any(|(_, _, command)| classify_process(command) == Some(ProcessSessionKind::CodexCli));
    let cursor_agent_present = processes
        .iter()
        .any(|(_, _, command)| classify_process(command) == Some(ProcessSessionKind::CursorAgent));

    for (pid_text, command, lower) in processes {
        let Some(kind) = classify_process(&lower) else {
            continue;
        };
        if !should_attach_process(kind, codex_cli_present, cursor_agent_present) {
            continue;
        }
        let provider = kind.provider();
        let pid = pid_text.parse::<u32>().ok();
        if provider == "claude" && pid.is_some_and(|value| claude_agent_pids.contains(&value)) {
            continue;
        }

        let project = infer_project(&command)
            .or_else(|| pid.and_then(process_cwd).and_then(|path| project_name(&path)));
        let key = format!("{provider}:process:{}", project.as_deref().unwrap_or(&pid_text));
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

fn mark_sessions_observed(snapshots: &mut [ProviderSnapshot]) {
    for snapshot in snapshots.iter_mut() {
        if !matches!(snapshot.provider.as_str(), "codex" | "claude" | "cursor") {
            continue;
        }
        snapshot.capabilities.push("sessions".into());
        snapshot.capabilities.sort();
        snapshot.capabilities.dedup();
    }
}

fn attach_session(snapshots: &mut [ProviderSnapshot], session: AgentSession) {
    let Some(snapshot) = snapshots
        .iter_mut()
        .find(|snapshot| snapshot.provider == session.provider)
    else {
        return;
    };
    snapshot.capabilities.push("sessions".into());
    snapshot.capabilities.sort();
    snapshot.capabilities.dedup();
    snapshot.sessions.push(session);
}

fn collect_claude_agent_sessions() -> Vec<DetectedClaudeSession> {
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

fn parse_claude_agents_json(payload: &Value) -> Vec<DetectedClaudeSession> {
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

            let pid = item.get("pid").and_then(value_as_u32);
            let id = item
                .get("id")
                .or_else(|| item.get("sessionId"))
                .or_else(|| item.get("session_id"))
                .and_then(value_as_string)
                .or_else(|| pid.map(|value| value.to_string()))?;
            let cwd = item.get("cwd").and_then(Value::as_str).map(PathBuf::from);
            let project = cwd.as_deref().and_then(project_name);
            let started_at = item
                .get("startedAt")
                .or_else(|| item.get("started_at"))
                .and_then(Value::as_str)
                .map(ToString::to_string);

            Some(DetectedClaudeSession {
                session: AgentSession {
                    id,
                    provider: "claude".into(),
                    project,
                    status: "active".into(),
                    started_at,
                    last_activity_at: None,
                },
                pid,
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

fn value_as_u32(value: &Value) -> Option<u32> {
    match value {
        Value::Number(value) => value.as_u64().and_then(|value| u32::try_from(value).ok()),
        Value::String(value) => value.parse::<u32>().ok(),
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

fn classify_process(command: &str) -> Option<ProcessSessionKind> {
    if is_codex_cli_process(command) {
        Some(ProcessSessionKind::CodexCli)
    } else if is_claude_process(command) {
        Some(ProcessSessionKind::Claude)
    } else if is_cursor_agent_process(command) {
        Some(ProcessSessionKind::CursorAgent)
    } else if is_codex_desktop_process(command) {
        Some(ProcessSessionKind::CodexDesktop)
    } else if is_cursor_desktop_process(command) {
        Some(ProcessSessionKind::CursorDesktop)
    } else {
        None
    }
}

fn should_attach_process(kind: ProcessSessionKind, codex_cli_present: bool, cursor_agent_present: bool) -> bool {
    match kind {
        ProcessSessionKind::CodexDesktop => !codex_cli_present,
        ProcessSessionKind::CursorDesktop => !cursor_agent_present,
        _ => true,
    }
}

fn is_codex_cli_process(command: &str) -> bool {
    let explicit_cli = command.starts_with("codex ")
        || command.contains("/bin/codex ")
        || command.contains("/resources/codex ");
    explicit_cli
        && !command.contains("app-server")
        && !command.contains("codex helper")
        && !command.contains("cyboard")
}

fn is_codex_desktop_process(command: &str) -> bool {
    command.contains("/codex.app/contents/macos/codex")
        && !command.contains("codex helper")
        && !command.contains("/frameworks/")
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
    (command.contains("/cursor-agent ") || command.starts_with("cursor-agent "))
        && !command.contains("cyboard")
}

fn is_cursor_desktop_process(command: &str) -> bool {
    command.contains("/cursor.app/contents/macos/cursor")
        && !command.contains("cursor helper")
        && !command.contains("/frameworks/")
        && !command.contains("cyboard")
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
    fn detects_codex_cli_without_counting_desktop_infrastructure() {
        assert!(!is_codex_cli_process(
            "/applications/codex.app/contents/frameworks/codex helper (renderer).app/contents/macos/codex helper"
        ));
        assert!(!is_codex_cli_process(
            "/applications/codex.app/contents/resources/codex app-server --stdio"
        ));
        assert!(is_codex_cli_process(
            "/opt/homebrew/bin/codex exec /users/test/code/project"
        ));
    }

    #[test]
    fn detects_codex_desktop_main_process_as_session_fallback() {
        assert!(is_codex_desktop_process(
            "/applications/codex.app/contents/macos/codex"
        ));
        assert!(!is_codex_desktop_process(
            "/applications/codex.app/contents/frameworks/codex helper (renderer).app/contents/macos/codex helper"
        ));
        assert!(!should_attach_process(ProcessSessionKind::CodexDesktop, true, false));
        assert!(should_attach_process(ProcessSessionKind::CodexDesktop, false, false));
    }

    #[test]
    fn detects_native_version_named_claude_processes_without_counting_daemon_infrastructure() {
        assert!(is_claude_process(
            "/users/test/.local/share/claude/versions/2.1.233 --resume abc"
        ));
        assert!(!is_claude_process(
            "/users/test/.local/share/claude/versions/2.1.233 daemon run --origin transient"
        ));
        assert!(!is_claude_process(
            "/users/test/.local/share/claude/versions/2.1.233 --bg-pty-host /tmp/pty.sock"
        ));
        assert!(!is_claude_process(
            "/users/test/.local/bin/claude agents --json"
        ));
    }

    #[test]
    fn parses_live_claude_agent_view_sessions_and_skips_terminal_states() {
        let payload = json!([
            {
                "id": "worker-a",
                "pid": 1234,
                "state": "working",
                "cwd": "/Users/test/code/project-a",
                "startedAt": "2026-09-01T12:00:00Z"
            },
            {
                "sessionId": "worker-b",
                "pid": "2345",
                "state": "blocked",
                "cwd": "/Users/test/code/project-b"
            },
            {
                "id": "old-worker",
                "pid": 3456,
                "state": "stopped",
                "cwd": "/Users/test/code/project-c"
            }
        ]);
        let sessions = parse_claude_agents_json(&payload);
        assert_eq!(sessions.len(), 2);
        assert_eq!(sessions[0].session.id, "worker-a");
        assert_eq!(sessions[0].pid, Some(1234));
        assert_eq!(sessions[0].session.project.as_deref(), Some("project-a"));
        assert_eq!(sessions[0].session.status, "active");
        assert_eq!(sessions[1].session.id, "worker-b");
        assert_eq!(sessions[1].pid, Some(2345));
    }

    #[test]
    fn detects_cursor_agent_and_desktop_without_counting_helpers() {
        assert!(!is_cursor_agent_process(
            "/applications/cursor.app/contents/frameworks/cursor helper (plugin).app extension-host"
        ));
        assert!(is_cursor_agent_process("/usr/local/bin/cursor-agent run"));
        assert!(is_cursor_desktop_process(
            "/applications/cursor.app/contents/macos/cursor"
        ));
        assert!(!is_cursor_desktop_process(
            "/applications/cursor.app/contents/frameworks/cursor helper (plugin).app/contents/macos/cursor helper (plugin)"
        ));
        assert!(!should_attach_process(ProcessSessionKind::CursorDesktop, false, true));
        assert!(should_attach_process(ProcessSessionKind::CursorDesktop, false, false));
    }

    #[test]
    fn infers_project_from_absolute_path() {
        assert_eq!(
            infer_project("codex exec /Users/test/code/cyboard-punk"),
            Some("cyboard-punk".into())
        );
    }
}
