mod claude;
mod claude_usage;
mod codex_usage;
mod models;
mod parsers;
mod providers;
mod quota_history;
mod sessions;

use models::{ProviderSnapshot, ProviderSource, QuotaSample};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, PhysicalSize, Rect, State, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

const PROVIDER_REFRESH_FLOOR: Duration = Duration::from_secs(180);
const QUOTA_HISTORY_LIMIT: usize = 2_160;
const COMPACT_WINDOW_GAP: i32 = 6;

#[derive(Default)]
struct AppState {
    snapshots: Arc<Mutex<Vec<ProviderSnapshot>>>,
    last_provider_refresh: Arc<Mutex<Option<Instant>>>,
    refresh_gate: Arc<Mutex<()>>,
}

fn collect_snapshots() -> Vec<ProviderSnapshot> {
    // Claude uses the dedicated resilient adapter. Replace the legacy collector result
    // before optional local telemetry and session discovery are attached.
    let claude_snapshot = claude::collect();
    let mut snapshots = providers::collect_all();
    snapshots.retain(|snapshot| snapshot.provider != "claude");
    snapshots.push(claude_snapshot);
    codex_usage::attach(&mut snapshots);
    claude_usage::attach(&mut snapshots);
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

fn merge_into_state(
    current: &mut Vec<ProviderSnapshot>,
    mut refreshed: Vec<ProviderSnapshot>,
    provider: Option<&str>,
) {
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
                incoming.source = ProviderSource::new("local-cache", "last-known-good", true);
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
        if let Some(existing) = current
            .iter_mut()
            .find(|snapshot| snapshot.provider == incoming.provider)
        {
            *existing = incoming;
        } else {
            current.push(incoming);
        }
    }
}

fn hydrate_persisted_history(current: &[ProviderSnapshot], refreshed: &mut [ProviderSnapshot]) {
    for incoming in refreshed {
        if current
            .iter()
            .any(|snapshot| snapshot.provider == incoming.provider)
            || !incoming.quota_history.is_empty()
        {
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
    last_refresh
        .map(|last| now.duration_since(last) >= PROVIDER_REFRESH_FLOOR)
        .unwrap_or(true)
}

#[tauri::command]
fn get_provider_snapshots(state: State<'_, AppState>) -> Vec<ProviderSnapshot> {
    state
        .snapshots
        .lock()
        .map(|snapshots| snapshots.clone())
        .unwrap_or_default()
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

    Ok(state
        .snapshots
        .lock()
        .map(|snapshots| snapshots.clone())
        .unwrap_or_default())
}

fn compact_window_position(
    tray_position: PhysicalPosition<i32>,
    tray_size: PhysicalSize<u32>,
    window_size: PhysicalSize<u32>,
    work_area_position: PhysicalPosition<i32>,
    work_area_size: PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    let tray_center_x = tray_position.x as i64 + tray_size.width as i64 / 2;
    let min_x = work_area_position.x as i64;
    let min_y = work_area_position.y as i64;
    let max_x = (min_x + work_area_size.width as i64 - window_size.width as i64).max(min_x);
    let max_y = (min_y + work_area_size.height as i64 - window_size.height as i64).max(min_y);

    let x = (tray_center_x - window_size.width as i64 / 2).clamp(min_x, max_x);
    let below_y = tray_position.y as i64 + tray_size.height as i64 + COMPACT_WINDOW_GAP as i64;
    let above_y = tray_position.y as i64 - window_size.height as i64 - COMPACT_WINDOW_GAP as i64;
    let work_area_bottom = min_y + work_area_size.height as i64;
    let y = if below_y + window_size.height as i64 <= work_area_bottom {
        below_y.max(min_y)
    } else if above_y >= min_y {
        above_y
    } else {
        below_y.clamp(min_y, max_y)
    };

    PhysicalPosition::new(x as i32, y as i32)
}

fn position_compact_window(
    app: &tauri::AppHandle,
    window: &tauri::WebviewWindow,
    tray_rect: Rect,
) -> tauri::Result<()> {
    let scale_factor = window.scale_factor()?;
    let tray_position = tray_rect.position.to_physical::<i32>(scale_factor);
    let tray_size = tray_rect.size.to_physical::<u32>(scale_factor);
    let window_size = window.outer_size()?;
    let tray_center_x = tray_position.x as f64 + tray_size.width as f64 / 2.0;
    let tray_center_y = tray_position.y as f64 + tray_size.height as f64 / 2.0;
    let monitor = app
        .monitor_from_point(tray_center_x, tray_center_y)?
        .or(app.primary_monitor()?);

    if let Some(monitor) = monitor {
        let work_area = monitor.work_area();
        let position = compact_window_position(
            tray_position,
            tray_size,
            window_size,
            work_area.position,
            work_area.size,
        );
        window.set_position(position)?;
    }

    Ok(())
}

fn install_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let builder = TrayIconBuilder::new()
        .tooltip("CYBOARD")
        .icon(tauri::include_image!("icons/trayTemplate.png"))
        .icon_as_template(true);
    builder
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                rect,
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
                        // Position once while hidden, then enforce it again after the first show.
                        // On macOS the first show of an initially-hidden window can apply native
                        // placement after a pre-show set_position call, which caused the first
                        // tray click to appear in the wrong place while later clicks were correct.
                        let _ = window.unminimize();
                        let _ = position_compact_window(app, &window, rect);
                        let _ = window.show();
                        let _ = position_compact_window(app, &window, rect);
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
            #[cfg(debug_assertions)]
            show_dev_main_window(app);
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::Focused(false) if window.label() == "compact" => {
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![get_provider_snapshots, refresh_providers])
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
            source: ProviderSource::new("test", "fixture", false),
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
        assert_eq!(
            incoming
                .quota_history
                .last()
                .map(|sample| sample.used_percent),
            Some(30.0)
        );
    }

    #[test]
    fn preserves_last_good_quota_on_rate_limit() {
        let mut current = vec![snapshot(42.0)];
        let mut incoming = ProviderSnapshot::unavailable(
            "codex",
            "Codex",
            "rate-limited",
            "cooldown",
        );
        incoming.issue = Some(ProviderIssue {
            code: "rate-limited".into(),
            message: "cooldown".into(),
            retry_at: None,
        });
        merge_into_state(&mut current, vec![incoming], None);
        assert_eq!(current[0].quota[0].used_percent, 42.0);
        assert_eq!(current[0].freshness, "stale");
        assert_eq!(current[0].source.kind, "local-cache");
        assert_eq!(current[0].source.detail, "last-known-good");
        assert!(current[0].source.is_fallback);
    }

    #[test]
    fn enforces_provider_refresh_floor() {
        let now = Instant::now();
        assert!(may_refresh_providers(None, now));
        assert!(!may_refresh_providers(
            Some(now - Duration::from_secs(60)),
            now
        ));
        assert!(may_refresh_providers(
            Some(now - Duration::from_secs(181)),
            now
        ));
    }

    #[test]
    fn positions_compact_window_centered_below_tray_icon() {
        let position = compact_window_position(
            PhysicalPosition::new(1000, 0),
            PhysicalSize::new(24, 24),
            PhysicalSize::new(390, 500),
            PhysicalPosition::new(0, 24),
            PhysicalSize::new(1440, 876),
        );
        assert_eq!(position, PhysicalPosition::new(817, 30));
    }

    #[test]
    fn clamps_compact_window_to_work_area_edges() {
        let position = compact_window_position(
            PhysicalPosition::new(1420, 0),
            PhysicalSize::new(24, 24),
            PhysicalSize::new(390, 500),
            PhysicalPosition::new(0, 24),
            PhysicalSize::new(1440, 876),
        );
        assert_eq!(position, PhysicalPosition::new(1050, 30));
    }

    #[test]
    fn positions_compact_window_above_bottom_tray() {
        let position = compact_window_position(
            PhysicalPosition::new(1000, 880),
            PhysicalSize::new(24, 20),
            PhysicalSize::new(390, 500),
            PhysicalPosition::new(0, 0),
            PhysicalSize::new(1440, 900),
        );
        assert_eq!(position, PhysicalPosition::new(817, 374));
    }
}
