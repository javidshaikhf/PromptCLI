use keyring::Entry;
use tauri::AppHandle;

use crate::{
    errors::AppResult,
    settings,
};

const SERVICE_NAME: &str = "PromptCLI";

fn entry(account: &str) -> AppResult<Entry> {
    Ok(Entry::new(SERVICE_NAME, account)?)
}

pub fn save_provider_key(account: &str, api_key: &str) -> AppResult<()> {
    entry(account)?.set_password(api_key)?;
    Ok(())
}

pub fn remove_provider_key(account: &str) -> AppResult<()> {
    match entry(account)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

pub fn get_provider_key(app: &AppHandle, provider_id: &str) -> AppResult<Option<String>> {
    let settings = settings::load_settings(app)?;
    let Some(settings) = settings else {
        return Ok(None);
    };

    let Some(provider) = settings
        .providers
        .iter()
        .find(|provider| provider.provider_id == provider_id)
    else {
        return Ok(None);
    };

    match entry(&provider.keychain_account)?.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(provider.api_key_fallback.clone()),
        Err(error) => Err(error.into()),
    }
}
