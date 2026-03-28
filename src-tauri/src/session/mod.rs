use std::{
    collections::HashMap,
    io::{Read, Write},
    path::PathBuf,
    sync::{Arc, Mutex},
    thread,
};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::{
    errors::{AppResult, PromptCliError},
    models::{ExecutionPlan, SessionErrorEvent, SessionExitEvent, SessionOutputEvent, ShellSession},
};

#[cfg(target_os = "windows")]
fn command_exists(command: &str) -> bool {
    std::process::Command::new("where")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn default_shell() -> (String, Vec<String>) {
    #[cfg(target_os = "macos")]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        return (shell, vec!["-l".to_string()]);
    }

    #[cfg(target_os = "windows")]
    {
        if command_exists("pwsh.exe") {
            return ("pwsh.exe".to_string(), Vec::new());
        }
        return ("powershell.exe".to_string(), Vec::new());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        return (shell, vec!["-l".to_string()]);
    }
}

fn current_os() -> String {
    #[cfg(target_os = "macos")]
    {
        return "macos".to_string();
    }

    #[cfg(target_os = "windows")]
    {
        return "windows".to_string();
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        return "linux".to_string();
    }
}

struct SessionHandle {
    meta: Mutex<ShellSession>,
    writer: Mutex<Box<dyn Write + Send>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    child: Mutex<Box<dyn Child + Send>>,
    running_plan: Mutex<bool>,
}

#[derive(Default)]
pub struct SessionManager {
    sessions: Mutex<HashMap<String, Arc<SessionHandle>>>,
}

impl SessionManager {
    pub fn create_session(&self, app: AppHandle) -> AppResult<ShellSession> {
        let session_id = Uuid::new_v4().to_string();
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let cwd_string = cwd.display().to_string();
        let (shell, args) = default_shell();

        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut command = CommandBuilder::new(shell.clone());
        for arg in args {
            command.arg(arg);
        }
        command.cwd(cwd);

        let child = pair.slave.spawn_command(command)?;
        let mut reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        let session = ShellSession {
            id: session_id.clone(),
            tab_title: format!("Tab {}", self.len()? + 1),
            cwd: cwd_string,
            shell: shell.clone(),
            os: current_os(),
            status: "ready".to_string(),
            recent_output: String::new(),
        };

        let handle = Arc::new(SessionHandle {
            meta: Mutex::new(session.clone()),
            writer: Mutex::new(writer),
            master: Mutex::new(pair.master),
            child: Mutex::new(child),
            running_plan: Mutex::new(false),
        });

        self.sessions
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock session map."))?
            .insert(session_id.clone(), handle);

        let app_handle = app.clone();
        thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(count) => {
                        let data = String::from_utf8_lossy(&buffer[..count]).to_string();
                        let _ = app_handle.emit(
                            "session-output",
                            SessionOutputEvent {
                                session_id: session_id.clone(),
                                data,
                            },
                        );
                    }
                    Err(error) => {
                        let _ = app_handle.emit(
                            "session-error",
                            SessionErrorEvent {
                                session_id: session_id.clone(),
                                message: error.to_string(),
                            },
                        );
                        break;
                    }
                }
            }
        });

        Ok(session)
    }

    pub fn list_sessions(&self) -> AppResult<Vec<ShellSession>> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock session map."))?;

        sessions
            .values()
            .map(|session| {
                session
                    .meta
                    .lock()
                    .map(|meta| meta.clone())
                    .map_err(|_| PromptCliError::from("Failed to lock session metadata."))
            })
            .collect()
    }

    pub fn write_session(&self, session_id: &str, data: &str) -> AppResult<()> {
        let handle = self.get_session(session_id)?;
        let mut writer = handle
            .writer
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock session writer."))?;
        writer.write_all(data.as_bytes())?;
        writer.flush()?;
        Ok(())
    }

    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> AppResult<()> {
        let handle = self.get_session(session_id)?;
        let master = handle
            .master
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock PTY."))?;
        master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn close_session(&self, app: &AppHandle, session_id: &str) -> AppResult<()> {
        let removed = self
            .sessions
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock session map."))?
            .remove(session_id);

        let Some(handle) = removed else {
            return Ok(());
        };

        handle
            .child
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock child process."))?
            .kill()?;

        app.emit(
            "session-exit",
            SessionExitEvent {
                session_id: session_id.to_string(),
                exit_code: Some(0),
            },
        )?;

        Ok(())
    }

    pub async fn execute_plan(&self, app: &AppHandle, plan: &ExecutionPlan) -> AppResult<()> {
        let handle = self.get_session(&plan.session_id)?;

        {
            let mut running = handle
                .running_plan
                .lock()
                .map_err(|_| PromptCliError::from("Failed to lock plan state."))?;
            if *running {
                return Err(PromptCliError::from(
                    "A plan is already running in this terminal tab.",
                ));
            }
            *running = true;
        }

        let execution_result: AppResult<()> = async {
            for step in &plan.steps {
                self.write_session(&plan.session_id, &format!("{}\n", step.command))?;
                tokio::time::sleep(std::time::Duration::from_millis(120)).await;
            }

            if plan.steps.is_empty() {
                app.emit(
                    "session-error",
                    SessionErrorEvent {
                        session_id: plan.session_id.clone(),
                        message: "Execution plan contained no commands.".to_string(),
                    },
                )?;
            }

            Ok(())
        }
        .await;

        let mut running = handle
            .running_plan
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock plan state."))?;
        *running = false;
        execution_result
    }

    fn get_session(&self, session_id: &str) -> AppResult<Arc<SessionHandle>> {
        self.sessions
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock session map."))?
            .get(session_id)
            .cloned()
            .ok_or_else(|| PromptCliError::from("Session not found."))
    }

    fn len(&self) -> AppResult<usize> {
        Ok(self
            .sessions
            .lock()
            .map_err(|_| PromptCliError::from("Failed to lock session map."))?
            .len())
    }
}
