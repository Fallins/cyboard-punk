use crate::models::{ProviderIssue, ProviderSnapshot};
use chrono::{DateTime, Utc};
use std::path::{Path, PathBuf};

const CACHE_MAX_AGE_SECONDS: i64 = 24 * 60 * 60;
const RESET_UNKNOWN_MAX_AGE_SECONDS: i64 = 30 * 60;

pub fn resolve(incoming: ProviderSnapshot) -> ProviderSnapshot {
    resolve_with_path(incoming, &cache_path())
}

fn resolve_with_path(mut incoming: ProviderSnapshot, path: &Path) -> ProviderSnapshot {
    if incoming.freshness == "fresh" && !incoming.quota.is_empty() {
        persist(path, &incoming);
        return incoming;
    }

    let original_issue = incoming.issue.clone();
    let Some(mut cached) = load_valid(path) else {
        return incoming;
    };

    cached.freshness = "stale".into();
    cached.sessions.clear();
    let cached_at = cached.updated_at.clone();
    let original_message = original_issue
        .as_ref()
        .map(|issue| issue.message.as_str())
        .filter(|message| !message.trim().is_empty());
    let message = match original_message {
        Some(message) => format!(
            "Live Antigravity quota is unavailable; showing last known valid quota from {cached_at}. {message}"
        ),
        None => format!(
            "Live Antigravity quota is unavailable; showing last known valid quota from {cached_at}"
        ),
    };
    cached.issue = Some(ProviderIssue {
        code: "stale-cache".into(),
        message,
        retry_at: original_issue.and_then(|issue| issue.retry_at),
    });
    cached
}

fn cache_path() -> PathBuf {
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("~"));
    home.join("Library/Application Support/CYBOARD/cache/antigravity.json")
}

fn persist(path: &Path, snapshot: &ProviderSnapshot) {
    let Some(parent) = path.parent() else {
        return;
    };
    if std::fs::create_dir_all(parent).is_err() {
        return;
    }
    let Ok(bytes) = serde_json::to_vec(snapshot) else {
        return;
    };
    let temp = path.with_extension("json.tmp");
    if std::fs::write(&temp, bytes).is_ok() {
        let _ = std::fs::rename(temp, path);
    }
}

fn load_valid(path: &Path) -> Option<ProviderSnapshot> {
    let bytes = std::fs::read(path).ok()?;
    let mut snapshot = serde_json::from_slice::<ProviderSnapshot>(&bytes).ok()?;
    if snapshot.provider != "antigravity" || snapshot.quota.is_empty() {
        return None;
    }

    let fetched_at = DateTime::parse_from_rfc3339(&snapshot.updated_at)
        .ok()?
        .with_timezone(&Utc);
    let age_seconds = Utc::now().signed_duration_since(fetched_at).num_seconds();
    if age_seconds < 0 || age_seconds > CACHE_MAX_AGE_SECONDS {
        return None;
    }

    let now = Utc::now();
    snapshot.quota.retain(|window| {
        match window
            .reset_at
            .as_deref()
            .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
            .map(|value| value.with_timezone(&Utc))
        {
            Some(reset_at) => reset_at > now,
            None => age_seconds <= RESET_UNKNOWN_MAX_AGE_SECONDS,
        }
    });

    if snapshot.quota.is_empty() {
        None
    } else {
        if !snapshot.capabilities.iter().any(|capability| capability == "quota") {
            snapshot.capabilities.push("quota".into());
        }
        Some(snapshot)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ProviderSnapshot, QuotaWindow};

    fn cache_file(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "cyboard-{name}-{}-{}.json",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ))
    }

    fn fresh_snapshot(reset_after_minutes: i64) -> ProviderSnapshot {
        ProviderSnapshot {
            provider: "antigravity".into(),
            display_name: "Antigravity".into(),
            capabilities: vec!["quota".into()],
            quota: vec![QuotaWindow {
                id: "gemini-session".into(),
                label: "Gemini 5h".into(),
                used_percent: 12.0,
                reset_at: Some((Utc::now() + chrono::Duration::minutes(reset_after_minutes)).to_rfc3339()),
            }],
            quota_history: Vec::new(),
            usage: Vec::new(),
            sessions: Vec::new(),
            freshness: "fresh".into(),
            updated_at: Utc::now().to_rfc3339(),
            issue: None,
        }
    }

    #[test]
    fn serves_last_good_quota_when_live_source_disappears() {
        let path = cache_file("antigravity-last-good");
        let saved = resolve_with_path(fresh_snapshot(60), &path);
        assert_eq!(saved.freshness, "fresh");

        let unavailable = ProviderSnapshot::unavailable(
            "antigravity",
            "Antigravity",
            "not-running",
            "Antigravity is not running",
        );
        let cached = resolve_with_path(unavailable, &path);
        assert_eq!(cached.freshness, "stale");
        assert_eq!(cached.quota.len(), 1);
        assert_eq!(cached.quota[0].used_percent, 12.0);
        assert_eq!(cached.issue.as_ref().map(|issue| issue.code.as_str()), Some("stale-cache"));
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn drops_cached_windows_after_their_reset_time() {
        let path = cache_file("antigravity-expired");
        persist(&path, &fresh_snapshot(-1));
        assert!(load_valid(&path).is_none());
        let _ = std::fs::remove_file(path);
    }
}
