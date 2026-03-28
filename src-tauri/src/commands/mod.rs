use tauri::{AppHandle, State};

use crate::{
    models::{AppSettings, ExecutionPlan, ShellSession},
    secrets,
    session::SessionManager,
    settings,
};

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<Option<AppSettings>, String> {
    settings::load_settings(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    settings::save_settings(&app, &settings).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_provider_key(
    provider_id: String,
    keychain_account: String,
    api_key: String,
) -> Result<(), String> {
    let _ = provider_id;
    secrets::save_provider_key(&keychain_account, &api_key).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_provider_key(app: AppHandle, provider_id: String) -> Result<Option<String>, String> {
    secrets::get_provider_key(&app, &provider_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn remove_provider_key(app: AppHandle, provider_id: String) -> Result<(), String> {
    let settings = settings::load_settings(&app).map_err(|error| error.to_string())?;
    if let Some(settings) = settings {
        if let Some(provider) = settings
            .providers
            .iter()
            .find(|provider| provider.provider_id == provider_id)
        {
            return secrets::remove_provider_key(&provider.keychain_account)
                .map_err(|error| error.to_string());
        }
    }

    Ok(())
}

#[tauri::command]
pub fn create_session(
    app: AppHandle,
    sessions: State<'_, SessionManager>,
) -> Result<ShellSession, String> {
    sessions
        .create_session(app)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_sessions(sessions: State<'_, SessionManager>) -> Result<Vec<ShellSession>, String> {
    sessions.list_sessions().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn write_session(
    session_id: String,
    data: String,
    sessions: State<'_, SessionManager>,
) -> Result<(), String> {
    sessions
        .write_session(&session_id, &data)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resize_session(
    session_id: String,
    cols: u16,
    rows: u16,
    sessions: State<'_, SessionManager>,
) -> Result<(), String> {
    sessions
        .resize_session(&session_id, cols, rows)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn close_session(
    app: AppHandle,
    session_id: String,
    sessions: State<'_, SessionManager>,
) -> Result<(), String> {
    sessions
        .close_session(&app, &session_id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn execute_execution_plan(
    app: AppHandle,
    plan: ExecutionPlan,
    sessions: State<'_, SessionManager>,
) -> Result<(), String> {
    sessions
        .execute_plan(&app, &plan)
        .await
        .map_err(|error| error.to_string())
}

