export type ProviderId = "openai" | "anthropic";
export type SafetyMode = "preview_confirm";
export type PlanRisk = "safe" | "elevated" | "destructive";
export type StepKind = "intent" | "shell";
export type SessionStatus = "starting" | "ready" | "closed" | "error";
export type AppScreen = "boot" | "onboarding" | "workspace" | "settings";

export interface ProviderConfig {
  providerId: ProviderId;
  defaultModel: string;
  enabled: boolean;
  keychainAccount: string;
}

export interface AppSettings {
  activeProviderId: ProviderId;
  providers: ProviderConfig[];
  safetyMode: SafetyMode;
  defaultShellMac: "login_shell";
  defaultShellWindows: "pwsh" | "powershell";
}

export interface ShellSession {
  id: string;
  tabTitle: string;
  cwd: string;
  shell: string;
  os: "macos" | "windows" | "linux";
  status: SessionStatus;
  recentOutput: string;
}

export interface PlanStep {
  id: string;
  kind: StepKind;
  title: string;
  rationale: string;
  command: string;
  cwdPolicy: "session" | "explicit";
}

export interface ExecutionPlan {
  id: string;
  sessionId: string;
  userRequest: string;
  summary: string;
  risk: PlanRisk;
  requiresConfirmation: true;
  assumptions: string[];
  missingInputs: string[];
  steps: PlanStep[];
}

export interface IntentResult {
  matchedIntent:
    | "git.push"
    | "git.pull"
    | "git.status"
    | "file.move"
    | "file.copy"
    | "file.delete"
    | "file.mkdir"
    | "search.text"
    | "process.list"
    | "process.kill"
    | "package.install"
    | "package.run"
    | null;
  confidence: number;
  missingInputs: string[];
}

export interface ModelOption {
  id: string;
  label: string;
  providerId: ProviderId;
}

export interface ProviderValidationInput {
  apiKey: string;
  model: string;
}

export interface PlannerInput {
  session: ShellSession;
  settings: AppSettings;
  request: string;
}

export interface PlanExecutionState {
  status: "idle" | "generating" | "ready" | "running" | "failed";
  error: string | null;
}

export interface SessionOutputEvent {
  sessionId: string;
  data: string;
}

export interface SessionExitEvent {
  sessionId: string;
  exitCode: number | null;
}

export interface SessionErrorEvent {
  sessionId: string;
  message: string;
}

