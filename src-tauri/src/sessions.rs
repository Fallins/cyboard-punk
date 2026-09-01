use crate::models::{AgentSession, ProviderSnapshot};
use std::process::Command;

pub fn attach_sessions(snapshots: &mut [ProviderSnapshot]) {
    let Ok(output) = Command::new("/bin/ps").args(["-axo", "pid=,command="]).output() else {
        return;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let trimmed = line.trim();
        let mut parts = trimmed.splitn(2, char::is_whitespace);
        let Some(pid) = parts.next().filter(|value| !value.is_empty()) else { continue };
        let command = parts.next().unwrap_or("").trim();
        let lower = command.to_lowercase();
        let provider = if is_codex_process(&lower) {
            Some("codex")
        } else if is_claude_process(&lower) {
            Some("claude")
        } else if is_cursor_agent_process(&lower) {
            Some("cursor")
        } else {
            None
        };
        let Some(provider) = provider else { continue };
        let Some(snapshot) = snapshots.iter_mut().find(|snapshot| snapshot.provider == provider) else { continue };
        if snapshot.sessions.iter().any(|session| session.id == pid) {
            continue;
        }
        snapshot.capabilities.push("sessions".into());
        snapshot.capabilities.sort();
        snapshot.capabilities.dedup();
        snapshot.sessions.push(AgentSession {
            id: pid.into(),
            provider: provider.into(),
            project: infer_project(command),
            status: "active".into(),
            started_at: None,
            last_activity_at: None,
        });
    }
}

fn is_codex_process(command: &str) -> bool {
    (command.contains("/codex") || command.starts_with("codex "))
        && !command.contains("app-server --stdio")
        && !command.contains("cyboard")
}

fn is_claude_process(command: &str) -> bool {
    (command.contains("/claude") || command.starts_with("claude ")) && !command.contains("cyboard")
}

fn is_cursor_agent_process(command: &str) -> bool {
    // Cursor spawns many extension-host/helper processes. Treating those as agent
    // sessions creates wildly inflated counts, so only accept an explicit
    // cursor-agent executable/process until we have a stable session source.
    (command.contains("/cursor-agent") || command.starts_with("cursor-agent ")) && !command.contains("cyboard")
}

fn infer_project(command: &str) -> Option<String> {
    let candidates = command
        .split_whitespace()
        .filter(|part| part.starts_with('/') && !part.starts_with("/Applications/") && !part.starts_with("/usr/") && !part.starts_with("/opt/"));
    candidates
        .last()
        .and_then(|path| path.trim_end_matches('/').rsplit('/').next())
        .filter(|name| !name.is_empty())
        .map(ToString::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn excludes_cyboard_codex_app_server() {
        assert!(!is_codex_process("/applications/codex.app/contents/resources/codex app-server --stdio"));
        assert!(is_codex_process("/opt/homebrew/bin/codex exec"));
    }

    #[test]
    fn excludes_cursor_extension_hosts_from_agent_count() {
        assert!(!is_cursor_agent_process(
            "/applications/cursor.app/contents/frameworks/cursor helper (plugin).app extension-host"
        ));
        assert!(is_cursor_agent_process("/usr/local/bin/cursor-agent run"));
    }

    #[test]
    fn infers_project_from_absolute_path() {
        assert_eq!(infer_project("codex exec /Users/test/code/cyboard-punk"), Some("cyboard-punk".into()));
    }
}
