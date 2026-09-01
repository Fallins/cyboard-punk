mod models;
mod providers;
mod sessions;

use models::{ProviderSnapshot, UsageSample};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

#[derive(Default)]
struct AppState {
    snapshots: Arc<Mutex<Vec<ProviderSnapshot>>>,
}

fn collect_snapshots() -> Vec<ProviderSnapshot> {
    let mut snapshots = providers::collect_all();
    sessions::attach_sessions(&mut snapshots);
    snapshots
}

fn merge_history(existing: Option<&ProviderSnapshot>, incoming: &mut ProviderSnapshot) {
    let mut history = existing.map(|snapshot| snapshot.usage.clone()).unwrap_or_default();
    if let Some(primary) = incoming.quota.first() {
        history.push(UsageSample {
            at: incoming.updated_at.clone(),
            tokens: None,
            requests: Some(primary.used_percent),
            cost_usd: None,
        });
    }
    if history.len() > 720 {
        history.drain(..history.len() - 720);
    }
    incoming.usage = history;
    if !incoming.usage.is_empty() && !incoming.capabilities.iter().any(|capability| capability == "usage") {
        incoming.capabilities.push("usage".into());
    }
}

fn merge_into_state(current: &mut Vec<ProviderSnapshot>, mut refreshed: Vec<ProviderSnapshot>, provider: Option<&str>) {
    for incoming in &mut refreshed {
        let existing = current.iter().find(|snapshot| snapshot.provider == incoming.provider);
        merge_history(existing, incoming);
    }

    if provider.is_none() {
        *current = refreshed;
        return;
    }

    for incoming in refreshed {
        if let Some(existing) = current.iter_mut().find(|snapshot| snapshot.provider == incoming.provider) {
            *existing = incoming;
        } else {
            current.push(incoming);
        }
    }
}

#[tauri::command]
fn get_provider_snapshots(state: State<'_, AppState>) -> Vec<ProviderSnapshot> {
    state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default()
}

#[tauri::command]
async fn refresh_providers(state: State<'_, AppState>, provider: Option<String>) -> Result<Vec<ProviderSnapshot>, String> {
    let refreshed = tauri::async_runtime::spawn_blocking(collect_snapshots)
        .await
        .map_err(|error| error.to_string())?;
    let selected = match provider.as_deref() {
        Some(provider) => refreshed
            .into_iter()
            .filter(|snapshot| snapshot.provider == provider)
            .collect::<Vec<_>>(),
        None => refreshed,
    };

    if let Ok(mut snapshots) = state.snapshots.lock() {
        merge_into_state(&mut snapshots, selected, provider.as_deref());
    }
    Ok(state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default())
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut refreshed = tauri::async_runtime::spawn_blocking(collect_snapshots).await.unwrap_or_default();
                for snapshot in &mut refreshed {
                    merge_history(None, snapshot);
                }
                if let Some(state) = handle.try_state::<AppState>() {
                    if let Ok(mut snapshots) = state.snapshots.lock() {
                        *snapshots = refreshed;
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_provider_snapshots, refresh_providers])
        .run(tauri::generate_context!())
        .expect("error while running CYBOARD");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::QuotaWindow;

    fn snapshot(percent: f64) -> ProviderSnapshot {
        ProviderSnapshot {
            provider: "codex".into(),
            display_name: "Codex".into(),
            capabilities: vec!["quota".into()],
            quota: vec![QuotaWindow { id: "weekly".into(), label: "7d".into(), used_percent: percent, reset_at: None }],
            usage: Vec::new(),
            sessions: Vec::new(),
            freshness: "fresh".into(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            issue: None,
        }
    }

    #[test]
    fn appends_bounded_usage_history() {
        let existing = snapshot(20.0);
        let mut incoming = snapshot(30.0);
        merge_history(Some(&existing), &mut incoming);
        assert_eq!(incoming.usage.len(), 1);
        assert_eq!(incoming.usage[0].requests, Some(30.0));
    }
}
