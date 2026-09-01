mod antigravity;
mod antigravity_cache;
mod antigravity_cloud;
mod antigravity_oauth;
mod antigravity_provider;
mod claude;
mod models;
mod parsers;
mod providers;
mod quota_history;
mod sessions;

use models::{ProviderSnapshot, QuotaSample};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

const PROVIDER_REFRESH_FLOOR: Duration = Duration::from_secs(180);
const QUOTA_HISTORY_LIMIT: usize = 2_160;

#[derive(Default)]
struct AppState {
    snapshots: Arc<Mutex<Vec<ProviderSnapshot>>>,
    last_provider_refresh: Arc<Mutex<Option<Instant>>>,
    refresh_gate: Arc<Mutex<()>>,
}

fn collect_snapshots() -> Vec<ProviderSnapshot> {
    // Resolve Claude first. A successful OAuth/CLI fallback writes the shared CYBOARD cache,
    // so the legacy collector below sees cached data instead of issuing a duplicate live request.
    let claude_snapshot = claude::collect();
    let mut snapshots = providers::collect_all();
    snapshots.retain(|snapshot| snapshot.provider != "claude");
    snapshots.push(claude_snapshot);
    snapshots.push(antigravity_cache::resolve(antigravity_provider::collect()));
    sessions::attach_sessions(&mut snapshots);
    snapshots
}

fn merge_quota_history(existing: Option<&ProviderSnapshot>, incoming: &mut ProviderSnapshot) {
    let mut history = existing
        .map(|snapshot| snapshot.quota_history.clone())
        .unwrap_or_else(|| incoming.quota_history.clone());
    for window in &incoming.quota {
        history.push(QuotaSample {
            at: incoming.updated_at.clone(),
            window_id: window.id.clone(),
            used_percent: window.used_percent,
        });
    }
    if history.len() > QUOTA_HISTORY_LIMIT {
        history.drain(..history.len() - QUOTA_HISTORY_LIMIT);
    }
    incoming.quota_history = history;
}

fn should_preserve_previous_quota(incoming: &ProviderSnapshot) -> bool {
    incoming.quota.is_empty()
        && incoming
            .issue
            .as_ref()
            .map(|issue| matches!(issue.code.as_str(), "rate-limited" | "network"))
            .unwrap_or(false)
}

fn merge_into_state(current: &mut Vec<ProviderSnapshot>, mut refreshed: Vec<ProviderSnapshot>, provider: Option<&str>) {
    for incoming in &mut refreshed {
        let existing = current.iter().find(|snapshot| snapshot.provider == incoming.provider);
        merge_quota_history(existing, incoming);
        if incoming.usage.is_empty() {
            incoming.usage = existing.map(|snapshot| snapshot.usage.clone()).unwrap_or_default();
        }
        if should_preserve_previous_quota(incoming) {
            if let Some(existing) = existing.filter(|snapshot| !snapshot.quota.is_empty()) {
                incoming.quota = existing.quota.clone();
                incoming.freshness = "stale".into();
                if !incoming.capabilities.iter().any(|capability| capability == "quota") {
                    incoming.capabilities.push("quota".into());
                }
            }
        }
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

fn hydrate_persisted_history(current: &[ProviderSnapshot], refreshed: &mut [ProviderSnapshot]) {
    for incoming in refreshed {
        if current.iter().any(|snapshot| snapshot.provider == incoming.provider) || !incoming.quota_history.is_empty() {
            continue;
        }
        incoming.quota_history = quota_history::load_provider(&incoming.provider);
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
async fn antigravity_auth_status() -> Result<antigravity_oauth::AntigravityAuthStatus, String> {
    let status = tauri::async_runtime::spawn_blocking(antigravity_oauth::auth_status)
        .await
        .map_err(|error| error.to_string())?;
    Ok(status)
}

#[tauri::command]
async fn connect_antigravity_google() -> Result<antigravity_oauth::AntigravityAuthStatus, String> {
    tauri::async_runtime::spawn_blocking(antigravity_oauth::connect)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
fn cancel_antigravity_google() {
    antigravity_oauth::cancel();
}

#[tauri::command]
async fn disconnect_antigravity_google() -> Result<antigravity_oauth::AntigravityAuthStatus, String> {
    tauri::async_runtime::spawn_blocking(antigravity_oauth::disconnect)
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn refresh_providers(
    state: State<'_, AppState>,
    provider: Option<String>,
    force: Option<bool>,
) -> Result<Vec<ProviderSnapshot>, String> {
    let snapshots = Arc::clone(&state.snapshots);
    let last_provider_refresh = Arc::clone(&state.last_provider_refresh);
    let refresh_gate = Arc::clone(&state.refresh_gate);
    let provider_filter = provider.clone();
    let force_refresh = force.unwrap_or(false);

    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _gate = refresh_gate
            .lock()
            .map_err(|_| "Provider refresh gate is poisoned".to_string())?;
        let now = Instant::now();
        let should_refresh = force_refresh
            || last_provider_refresh
                .lock()
                .map(|last| may_refresh_providers(*last, now))
                .unwrap_or(true);

        if should_refresh {
            let refreshed = collect_snapshots();
            let mut selected = match provider_filter.as_deref() {
                Some(provider) => refreshed
                    .into_iter()
                    .filter(|snapshot| snapshot.provider == provider)
                    .collect::<Vec<_>>(),
                None => refreshed,
            };
            if let Ok(mut current) = snapshots.lock() {
                hydrate_persisted_history(&current, &mut selected);
                merge_into_state(&mut current, selected, provider_filter.as_deref());
                quota_history::persist_snapshots(&current);
            }
            if let Ok(mut last_refresh) = last_provider_refresh.lock() {
                *last_refresh = Some(Instant::now());
            }
        } else if let Ok(mut current) = snapshots.lock() {
            refresh_sessions_only(&mut current);
        }
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())??;

    Ok(state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default())
}

fn install_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let builder = TrayIconBuilder::new()
        .tooltip("CYBOARD")
        .icon(tauri::include_image!("icons/trayTemplate.png"))
        .icon_as_template(true);
    builder
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("compact") {
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

#[cfg(debug_assertions)]
fn show_dev_main_window(app: &tauri::App) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(AppState::default())
        .setup(|app| {
            install_tray(app)?;
            let _ = std::thread::spawn(antigravity_oauth::prewarm);
            #[cfg(debug_assertions)]
            show_dev_main_window(app);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_provider_snapshots,
            refresh_providers,
            antigravity_auth_status,
            connect_antigravity_google,
            cancel_antigravity_google,
            disconnect_antigravity_google
        ])
        .run(tauri::generate_context!())
        .expect("error while running CYBOARD");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ProviderIssue, QuotaWindow};

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
            quota_history: Vec::new(),
            usage: Vec::new(),
            sessions: Vec::new(),
            freshness: "fresh".into(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            issue: None,
        }
    }

    #[test]
    fn appends_quota_history() {
        let existing = snapshot(20.0);
        let mut incoming = snapshot(30.0);
        merge_quota_history(Some(&existing), &mut incoming);
        assert_eq!(incoming.quota_history.len(), 1);
        assert_eq!(incoming.quota_history[0].used_percent, 30.0);
        assert_eq!(incoming.quota_history[0].window_id, "weekly");
    }

    #[test]
    fn seeds_quota_history_when_no_in_memory_snapshot_exists() {
        let mut incoming = snapshot(30.0);
        incoming.quota_history.push(QuotaSample {
            at: "2026-08-31T23:00:00Z".into(),
            window_id: "weekly".into(),
            used_percent: 20.0,
        });
        merge_quota_history(None, &mut incoming);
        assert_eq!(incoming.quota_history.len(), 2);
        assert_eq!(incoming.quota_history[0].used_percent, 20.0);
        assert_eq!(incoming.quota_history[1].used_percent, 30.0);
    }

    #[test]
    fn bounds_quota_history() {
        let mut existing = snapshot(20.0);
        existing.quota_history = (0..QUOTA_HISTORY_LIMIT)
            .map(|index| QuotaSample {
                at: format!("2026-09-01T00:{:02}:00Z", index % 60),
                window_id: "weekly".into(),
                used_percent: index as f64 / 100.0,
            })
            .collect();
        let mut incoming = snapshot(30.0);
        merge_quota_history(Some(&existing), &mut incoming);
        assert_eq!(incoming.quota_history.len(), QUOTA_HISTORY_LIMIT);
        assert_eq!(incoming.quota_history.last().map(|sample| sample.used_percent), Some(30.0));
    }

    #[test]
    fn preserves_last_good_quota_on_rate_limit() {
        let mut current = vec![snapshot(42.0)];
        let mut incoming = ProviderSnapshot::unavailable("codex", "Codex", "rate-limited", "cooldown");
        incoming.issue = Some(ProviderIssue {
            code: "rate-limited".into(),
            message: "cooldown".into(),
            retry_at: None,
        });
        merge_into_state(&mut current, vec![incoming], None);
        assert_eq!(current[0].quota[0].used_percent, 42.0);
        assert_eq!(current[0].freshness, "stale");
    }

    #[test]
    fn enforces_provider_refresh_floor() {
        let now = Instant::now();
        assert!(may_refresh_providers(None, now));
        assert!(!may_refresh_providers(Some(now - Duration::from_secs(60)), now));
        assert!(may_refresh_providers(Some(now - Duration::from_secs(181)), now));
    }
}
