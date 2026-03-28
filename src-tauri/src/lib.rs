mod commands;
mod errors;
mod models;
mod secrets;
mod session;
mod settings;

use session::SessionManager;

pub fn run() {
    tauri::Builder::default()
        .manage(SessionManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::load_settings,
            commands::save_settings,
            commands::save_provider_key,
            commands::get_provider_key,
            commands::remove_provider_key,
            commands::create_session,
            commands::list_sessions,
            commands::write_session,
            commands::resize_session,
            commands::close_session,
            commands::execute_execution_plan
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PromptCLI");
}

