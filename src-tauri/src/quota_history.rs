use crate::models::{ProviderSnapshot, QuotaSample};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

const HISTORY_VERSION: u8 = 1;
const MAX_SAMPLES_PER_PROVIDER: usize = 2_160;

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedQuotaHistory {
    version: u8,
    providers: BTreeMap<String, Vec<QuotaSample>>,
}

pub fn load_provider(provider: &str) -> Vec<QuotaSample> {
    load_from_path(&history_path())
        .providers
        .remove(provider)
        .unwrap_or_default()
}

pub fn persist_snapshots(snapshots: &[ProviderSnapshot]) {
    let mut providers = BTreeMap::new();
    for snapshot in snapshots {
        if snapshot.quota_history.is_empty() {
            continue;
        }
        let start = snapshot.quota_history.len().saturating_sub(MAX_SAMPLES_PER_PROVIDER);
        providers.insert(snapshot.provider.clone(), snapshot.quota_history[start..].to_vec());
    }
    persist_to_path(
        &history_path(),
        &PersistedQuotaHistory {
            version: HISTORY_VERSION,
            providers,
        },
    );
}

fn history_path() -> PathBuf {
    let home = std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("~"));
    home.join("Library/Application Support/CYBOARD/history/quota.json")
}

fn load_from_path(path: &Path) -> PersistedQuotaHistory {
    let Ok(bytes) = std::fs::read(path) else {
        return PersistedQuotaHistory {
            version: HISTORY_VERSION,
            providers: BTreeMap::new(),
        };
    };
    let Ok(mut history) = serde_json::from_slice::<PersistedQuotaHistory>(&bytes) else {
        return PersistedQuotaHistory {
            version: HISTORY_VERSION,
            providers: BTreeMap::new(),
        };
    };
    if history.version != HISTORY_VERSION {
        return PersistedQuotaHistory {
            version: HISTORY_VERSION,
            providers: BTreeMap::new(),
        };
    }
    for samples in history.providers.values_mut() {
        if samples.len() > MAX_SAMPLES_PER_PROVIDER {
            let remove = samples.len() - MAX_SAMPLES_PER_PROVIDER;
            samples.drain(..remove);
        }
    }
    history
}

fn persist_to_path(path: &Path, history: &PersistedQuotaHistory) {
    let Some(parent) = path.parent() else {
        return;
    };
    if std::fs::create_dir_all(parent).is_err() {
        return;
    }
    let Ok(bytes) = serde_json::to_vec(history) else {
        return;
    };
    let temp = path.with_extension("json.tmp");
    if std::fs::write(&temp, bytes).is_ok() {
        let _ = std::fs::rename(temp, path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn temp_file(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "cyboard-history-{name}-{}-{}.json",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ))
    }

    #[test]
    fn round_trips_history_without_credentials_or_provider_payloads() {
        let path = temp_file("round-trip");
        let sample = QuotaSample {
            at: "2026-09-01T00:00:00Z".into(),
            window_id: "7d".into(),
            used_percent: 42.0,
        };
        let mut providers = BTreeMap::new();
        providers.insert("codex".into(), vec![sample.clone()]);
        persist_to_path(
            &path,
            &PersistedQuotaHistory {
                version: HISTORY_VERSION,
                providers,
            },
        );

        let loaded = load_from_path(&path);
        assert_eq!(loaded.providers["codex"].len(), 1);
        assert_eq!(loaded.providers["codex"][0].window_id, sample.window_id);
        assert_eq!(loaded.providers["codex"][0].used_percent, 42.0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn ignores_unknown_history_versions() {
        let path = temp_file("version");
        let payload = serde_json::json!({
            "version": 99,
            "providers": {
                "codex": [{"at":"2026-09-01T00:00:00Z","windowId":"7d","usedPercent":42}]
            }
        });
        std::fs::write(&path, serde_json::to_vec(&payload).unwrap()).unwrap();
        assert!(load_from_path(&path).providers.is_empty());
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn trims_oversized_provider_history() {
        let path = temp_file("trim");
        let samples = (0..MAX_SAMPLES_PER_PROVIDER + 3)
            .map(|index| QuotaSample {
                at: format!("2026-09-01T00:{:02}:00Z", index % 60),
                window_id: "7d".into(),
                used_percent: index as f64,
            })
            .collect::<Vec<_>>();
        let mut providers = BTreeMap::new();
        providers.insert("codex".into(), samples);
        persist_to_path(
            &path,
            &PersistedQuotaHistory {
                version: HISTORY_VERSION,
                providers,
            },
        );
        let loaded = load_from_path(&path);
        assert_eq!(loaded.providers["codex"].len(), MAX_SAMPLES_PER_PROVIDER);
        let _ = std::fs::remove_file(path);
    }
}
