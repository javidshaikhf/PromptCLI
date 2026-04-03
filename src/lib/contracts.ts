export type ProviderId = "openai" | "anthropic";
export type SafetyMode = "preview_confirm";
export type PlanRisk = "safe" | "elevated" | "destructive";
export type StepKind = "intent" | "shell";
export type SessionStatus = "starting" | "ready" | "closed" | "error";
export type AppScreen = "boot" | "workspace" | "settings";
export type InputClassification = "shell" | "natural_language" | "ambiguous";
export type PlanSource = "intent" | "llm";
export type ApprovalState = "pending" | "approved" | "cancelled" | "failed";

export interface ProviderConfig {
  providerId: ProviderId;
  defaultModel: string;
  enabled: boolean;
  keychainAccount: string;
}

export interface AppSettings {
  activeProviderId: ProviderId | null;
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
  apiKeyOverride?: string | null;
}

export interface PromptSubmission {
  rawInput: string;
  normalizedInput: string;
  classification: InputClassification;
  override: "shell" | "natural_language" | null;
}

export interface ReviewedCommandPlan extends ExecutionPlan {
  source: PlanSource;
  approvalState: ApprovalState;
  providerId: ProviderId | null;
  model: string | null;
  createdAt: string;
}

export interface AiHistoryEntry {
  id: string;
  request: string;
  summary: string;
  commands: string[];
  risk: PlanRisk;
  source: PlanSource;
  status: ApprovalState | "needs_provider";
  providerId: ProviderId | null;
  model: string | null;
  createdAt: string;
}

export interface ProviderSetupState {
  open: boolean;
  reason: "first_nl_request" | "settings";
  pendingRequest: string | null;
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
