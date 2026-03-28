import type {
  AppSettings,
  ExecutionPlan,
  ProviderId,
  SessionErrorEvent,
  SessionExitEvent,
  SessionOutputEvent,
  ShellSession
} from "../contracts";

type UnlistenFn = () => void;

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const isTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;

async function invokeIfAvailable<T>(
  command: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (!isTauri) {
    throw new Error(`Tauri command "${command}" is not available in browser mode.`);
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function loadSettings(): Promise<AppSettings | null> {
  if (!isTauri) {
    return null;
  }

  return invokeIfAvailable<AppSettings | null>("load_settings");
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return invokeIfAvailable("save_settings", { settings });
}

export async function createSession(): Promise<ShellSession> {
  if (!isTauri) {
    return {
      id: crypto.randomUUID(),
      tabTitle: "Local Preview",
      cwd: "/workspace",
      shell: "preview-shell",
      os: "macos",
      status: "ready",
      recentOutput: "PromptCLI preview mode.\r\n"
    };
  }

  return invokeIfAvailable<ShellSession>("create_session");
}

export async function listSessions(): Promise<ShellSession[]> {
  if (!isTauri) {
    return [];
  }

  return invokeIfAvailable<ShellSession[]>("list_sessions");
}

export async function writeSession(
  sessionId: string,
  data: string
): Promise<void> {
  if (!isTauri) {
    return;
  }

  return invokeIfAvailable("write_session", { sessionId, data });
}

export async function resizeSession(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  if (!isTauri) {
    return;
  }

  return invokeIfAvailable("resize_session", { sessionId, cols, rows });
}

export async function closeSession(sessionId: string): Promise<void> {
  if (!isTauri) {
    return;
  }

  return invokeIfAvailable("close_session", { sessionId });
}

export async function saveProviderKey(
  providerId: ProviderId,
  keychainAccount: string,
  apiKey: string
): Promise<void> {
  return invokeIfAvailable("save_provider_key", {
    providerId,
    keychainAccount,
    apiKey
  });
}

export async function getProviderKey(
  providerId: ProviderId
): Promise<string | null> {
  return invokeIfAvailable<string | null>("get_provider_key", { providerId });
}

export async function removeProviderKey(providerId: ProviderId): Promise<void> {
  return invokeIfAvailable("remove_provider_key", { providerId });
}

export async function executePlan(plan: ExecutionPlan): Promise<void> {
  return invokeIfAvailable("execute_execution_plan", { plan });
}

export async function listenSessionOutput(
  handler: (event: SessionOutputEvent) => void
): Promise<UnlistenFn> {
  if (!isTauri) {
    return () => undefined;
  }

  const { listen } = await import("@tauri-apps/api/event");
  return listen<SessionOutputEvent>("session-output", (event) => {
    handler(event.payload);
  });
}

export async function listenSessionExit(
  handler: (event: SessionExitEvent) => void
): Promise<UnlistenFn> {
  if (!isTauri) {
    return () => undefined;
  }

  const { listen } = await import("@tauri-apps/api/event");
  return listen<SessionExitEvent>("session-exit", (event) => {
    handler(event.payload);
  });
}

export async function listenSessionError(
  handler: (event: SessionErrorEvent) => void
): Promise<UnlistenFn> {
  if (!isTauri) {
    return () => undefined;
  }

  const { listen } = await import("@tauri-apps/api/event");
  return listen<SessionErrorEvent>("session-error", (event) => {
    handler(event.payload);
  });
}

