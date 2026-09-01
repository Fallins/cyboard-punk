mod models;
mod providers;
mod sessions;

use models::ProviderSnapshot;
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

#[tauri::command]
fn get_provider_snapshots(state: State<'_, AppState>) -> Vec<ProviderSnapshot> {
    state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default()
}

#[tauri::command]
async fn refresh_providers(state: State<'_, AppState>, provider: Option<String>) -> Result<Vec<ProviderSnapshot>, String> {
    let refreshed = tauri::async_runtime::spawn_blocking(collect_snapshots)
        .await
        .map_err(|error| error.to_string())?;
    let filtered = match provider.as_deref() {
        Some(provider) => refreshed
            .into_iter()
            .filter(|snapshot| snapshot.provider == provider)
            .collect::<Vec<_>>(),
        None => refreshed,
    };

    if provider.is_none() {
        if let Ok(mut snapshots) = state.snapshots.lock() {
            *snapshots = filtered.clone();
        }
    } else if let Ok(mut snapshots) = state.snapshots.lock() {
        for incoming in &filtered {
            if let Some(existing) = snapshots.iter_mut().find(|item| item.provider == incoming.provider) {
                *existing = incoming.clone();
            } else {
                snapshots.push(incoming.clone());
            }
        }
    }
    Ok(state.snapshots.lock().map(|snapshots| snapshots.clone()).unwrap_or_default())
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let refreshed = tauri::async_runtime::spawn_blocking(collect_snapshots).await.unwrap_or_default();
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
