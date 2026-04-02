use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

use crate::{
    errors::AppResult,
    models::AppSettings,
};

const SETTINGS_FILE: &str = "settings.json";

fn settings_path(app: &AppHandle) -> AppResult<PathBuf> {
    let config_dir = app.path().app_config_dir()?;
    fs::create_dir_all(&config_dir)?;
    Ok(config_dir.join(SETTINGS_FILE))
}

pub fn load_settings(app: &AppHandle) -> AppResult<Option<AppSettings>> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(None);
    }

    let contents = fs::read_to_string(path)?;
    let settings = serde_json::from_str::<AppSettings>(&contents)?;
    Ok(Some(settings))
}

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> AppResult<()> {
    let path = settings_path(app)?;
    let contents = serde_json::to_string_pretty(settings)?;
    fs::write(path, contents)?;
    Ok(())
}
