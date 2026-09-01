use crate::models::{AgentSession, ProviderSnapshot};
use std::collections::HashSet;
use std::process::Command;

pub fn attach_sessions(snapshots: &mut [ProviderSnapshot]) {
    let Ok(output) = Command::new("/bin/ps").args(["-axo", "pid=,command="]).output() else {
        return;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let mut seen = HashSet::new();

    for line in text.lines() {
        let trimmed = line.trim();
        let mut parts = trimmed.splitn(2, char::is_whitespace);
        let Some(pid) = parts.next().filter(|value| !value.is_empty()) else {
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
        let project = infer_project(command);
        let key = format!("{provider}:{}", project.as_deref().unwrap_or("unknown"));
        if !seen.insert(key.clone()) {
            continue;
        }
        let Some(snapshot) = snapshots.iter_mut().find(|snapshot| snapshot.provider == provider) else {
            continue;
        };
        snapshot.capabilities.push("sessions".into());
        snapshot.capabilities.sort();
        snapshot.capabilities.dedup();
        snapshot.sessions.push(AgentSession {
            id: format!("{key}:{pid}"),
            provider: provider.into(),
            project,
            status: "active".into(),
            started_at: None,
            last_activity_at: None,
        });
    }
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
    let explicit_cli = command.starts_with("claude ") || command.contains("/bin/claude ");
    explicit_cli && !command.contains("claude helper") && !command.contains("cyboard")
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

fn infer_project(command: &str) -> Option<String> {
    let candidates = command.split_whitespace().filter(|part| {
        part.starts_with('/')
            && !part.starts_with("/Applications/")
            && !part.starts_with("/usr/")
            && !part.starts_with("/opt/")
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
