mod models;
mod parsers;
mod providers;
mod sessions;

use models::{ProviderSnapshot, UsageSample};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

const PROVIDER_REFRESH_FLOOR: Duration = Duration::from_secs(180);

#[derive(Default)]
struct AppState {
    snapshots: Arc<Mutex<Vec<ProviderSnapshot>>>,
    last_provider_refresh: Arc<Mutex<Option<Instant>>>,
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

fn refresh_sessions_only(snapshots: &mut [ProviderSnapshot]) {
    for snapshot in snapshots.iter_mut() {
        snapshot.sessions.clear();
        snapshot.capabilities.retain(|capability| capability != "sessions");
    }
    sessions::attach_sessions(snapshots);
}

fn may_refresh_providers(last_refresh: Option<Instant>, now: Instant) -> bool {
    last_refresh.map(|last| now.duration_since(last) >= PROVIDER_REFRESH_FLOOR).unwrap_or(true)
}

#[tauri::command]
fn get_provider_snapshots(state: State<'_, AppState>) -> Vec<ProviderSnapshot> {
    state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default()
}

#[tauri::command]
async fn refresh_providers(state: State<'_, AppState>, provider: Option<String>) -> Result<Vec<ProviderSnapshot>, String> {
    let now = Instant::now();
    let should_refresh = state
        .last_provider_refresh
        .lock()
        .map(|last| may_refresh_providers(*last, now))
        .unwrap_or(true);

    if should_refresh {
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
        if let Ok(mut last_refresh) = state.last_provider_refresh.lock() {
            *last_refresh = Some(now);
        }
    } else if let Ok(mut snapshots) = state.snapshots.lock() {
        refresh_sessions_only(&mut snapshots);
    }

    Ok(state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default())
}

fn install_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::new().tooltip("CYBOARD");
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone()).icon_as_template(true);
    }
    builder
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let visible = window.is_visible().unwrap_or(false);
                    if visible {
                        let _ = window.hide();
                    } else {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(AppState::default())
        .setup(|app| install_tray(app))
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
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
            quota: vec![QuotaWindow {
                id: "weekly".into(),
                label: "7d".into(),
                used_percent: percent,
                reset_at: None,
            }],
            usage: Vec::new(),
            sessions: Vec::new(),
            freshness: "fresh".into(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            issue: None,
        }
    }

    #[test]
    fn appends_usage_history() {
        let existing = snapshot(20.0);
        let mut incoming = snapshot(30.0);
        merge_history(Some(&existing), &mut incoming);
        assert_eq!(incoming.usage.len(), 1);
        assert_eq!(incoming.usage[0].requests, Some(30.0));
    }

    #[test]
    fn bounds_usage_history() {
        let mut existing = snapshot(20.0);
        existing.usage = (0..720)
            .map(|index| UsageSample {
                at: format!("2026-09-01T00:{:02}:00Z", index % 60),
                tokens: None,
                requests: Some(index as f64 / 10.0),
                cost_usd: None,
            })
            .collect();
        let mut incoming = snapshot(30.0);
        merge_history(Some(&existing), &mut incoming);
        assert_eq!(incoming.usage.len(), 720);
        assert_eq!(incoming.usage.last().and_then(|sample| sample.requests), Some(30.0));
    }

    #[test]
    fn enforces_provider_refresh_floor() {
        let now = Instant::now();
        assert!(may_refresh_providers(None, now));
        assert!(!may_refresh_providers(Some(now - Duration::from_secs(60)), now));
        assert!(may_refresh_providers(Some(now - Duration::from_secs(181)), now));
    }
}
