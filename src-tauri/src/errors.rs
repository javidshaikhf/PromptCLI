use thiserror::Error;

#[derive(Debug, Error)]
pub enum PromptCliError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error(transparent)]
    Keyring(#[from] keyring::Error),
}

impl From<&str> for PromptCliError {
    fn from(value: &str) -> Self {
        Self::Message(value.to_string())
    }
}

impl From<String> for PromptCliError {
    fn from(value: String) -> Self {
        Self::Message(value)
    }
}

pub type AppResult<T> = Result<T, PromptCliError>;
