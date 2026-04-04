use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub provider_id: String,
    pub default_model: String,
    pub enabled: bool,
    pub keychain_account: String,
    pub api_key_fallback: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub active_provider_id: Option<String>,
    pub providers: Vec<ProviderConfig>,
    pub safety_mode: String,
    pub default_shell_mac: String,
    pub default_shell_windows: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellSession {
    pub id: String,
    pub tab_title: String,
    pub cwd: String,
    pub shell: String,
    pub os: String,
    pub status: String,
    pub recent_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanStep {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub rationale: String,
    pub command: String,
    pub cwd_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionPlan {
    pub id: String,
    pub session_id: String,
    pub user_request: String,
    pub summary: String,
    pub risk: String,
    pub requires_confirmation: bool,
    pub assumptions: Vec<String>,
    pub missing_inputs: Vec<String>,
    pub steps: Vec<PlanStep>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionOutputEvent {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionExitEvent {
    pub session_id: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionErrorEvent {
    pub session_id: String,
    pub message: String,
}
