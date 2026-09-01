use crate::models::ProviderSnapshot;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

const PROBE_TIMEOUT: Duration = Duration::from_secs(10);
const POLL_INTERVAL: Duration = Duration::from_millis(250);

pub fn collect() -> ProviderSnapshot {
    let initial = crate::antigravity::collect();
    if is_ready(&initial) {
        return initial;
    }

    let Some(bundle) = installed_bundle() else {
        return initial;
    };

    let before = bundle_processes(&bundle);
    let launched_by_cyboard = before.is_empty();

    if launched_by_cyboard && !launch_hidden(&bundle) {
        return initial;
    }

    let deadline = Instant::now() + PROBE_TIMEOUT;
    let mut result = initial;
    while Instant::now() < deadline {
        thread::sleep(POLL_INTERVAL);
        result = crate::antigravity::collect();
        if is_ready(&result) {
            break;
        }
    }

    if launched_by_cyboard {
        terminate_new_bundle_processes(&bundle, &before);
    }

    result
}

fn is_ready(snapshot: &ProviderSnapshot) -> bool {
    snapshot.freshness == "fresh" && !snapshot.quota.is_empty()
}

fn installed_bundle() -> Option<PathBuf> {
    let mut candidates = vec![
        PathBuf::from("/Applications/Antigravity.app"),
        PathBuf::from("/Applications/Antigravity IDE.app"),
        PathBuf::from("/Applications/Antigravity 2.app"),
    ];
    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        candidates.extend([
            home.join("Applications/Antigravity.app"),
            home.join("Applications/Antigravity IDE.app"),
            home.join("Applications/Antigravity 2.app"),
        ]);
    }
    candidates.into_iter().find(|path| path.is_dir())
}

fn launch_hidden(bundle: &PathBuf) -> bool {
    Command::new("/usr/bin/open")
        .arg("-gj")
        .arg(bundle)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn bundle_processes(bundle: &PathBuf) -> HashSet<u32> {
    let output = match Command::new("/bin/ps")
        .args(["-axo", "pid=,command="])
        .output()
    {
        Ok(output) => output,
        Err(_) => return HashSet::new(),
    };
    let bundle_text = bundle.to_string_lossy();
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            let mut parts = trimmed.split_whitespace();
            let pid = parts.next()?.parse::<u32>().ok()?;
            let command = parts.collect::<Vec<_>>().join(" ");
            (command.contains(bundle_text.as_ref()) && command.contains("/Contents/")).then_some(pid)
        })
        .collect()
}

fn terminate_new_bundle_processes(bundle: &PathBuf, before: &HashSet<u32>) {
    let after = bundle_processes(bundle);
    let mut spawned = after.difference(before).copied().collect::<Vec<_>>();
    spawned.sort_unstable_by(|left, right| right.cmp(left));
    for pid in spawned {
        let _ = Command::new("/bin/kill")
            .args(["-TERM", &pid.to_string()])
            .status();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::QuotaWindow;

    #[test]
    fn ready_snapshot_requires_fresh_quota() {
        let mut snapshot = ProviderSnapshot::unavailable(
            "antigravity",
            "Antigravity",
            "not-running",
            "not running",
        );
        assert!(!is_ready(&snapshot));
        snapshot.freshness = "fresh".into();
        snapshot.quota.push(QuotaWindow {
            id: "gemini-session".into(),
            label: "Gemini 5h".into(),
            used_percent: 10.0,
            reset_at: None,
        });
        assert!(is_ready(&snapshot));
    }
}
