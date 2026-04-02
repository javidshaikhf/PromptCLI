import { useEffect, useMemo, useReducer, useState } from "react";
import type {
  AiHistoryEntry,
  AppScreen,
  AppSettings,
  PlanExecutionState,
  PromptSubmission,
  ProviderSetupState,
  ReviewedCommandPlan,
  ShellSession
} from "../lib/contracts";
import {
  createSession,
  executePlan,
  listenSessionError,
  listenSessionExit,
  listenSessionOutput,
  loadSettings,
  writeSession
} from "../lib/tauri/bridge";
import { generateReviewedCommandPlan } from "../lib/planner";
import { classifyPromptInput } from "../lib/planner/classifyInput";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { TerminalWorkspace } from "../features/terminal/TerminalWorkspace";
import { createDefaultSettings } from "../lib/settings/defaults";

interface AppState {
  screen: AppScreen;
  settings: AppSettings;
  sessions: ShellSession[];
  activeSessionId: string | null;
  currentPlan: ReviewedCommandPlan | null;
  pendingSubmission: PromptSubmission | null;
  planState: PlanExecutionState;
  aiHistory: AiHistoryEntry[];
  historyOpen: boolean;
  providerSetup: ProviderSetupState;
}

type Action =
  | { type: "booted"; settings: AppSettings }
  | { type: "set-settings"; settings: AppSettings }
  | { type: "add-session"; session: ShellSession }
  | { type: "select-session"; sessionId: string }
  | { type: "update-output"; sessionId: string; data: string }
  | { type: "session-exit"; sessionId: string }
  | { type: "session-error"; sessionId: string; message: string }
  | { type: "set-pending-submission"; submission: PromptSubmission }
  | { type: "planning" }
  | { type: "plan-ready"; plan: ReviewedCommandPlan }
  | { type: "plan-running" }
  | { type: "plan-error"; error: string }
  | { type: "plan-cleared" }
  | { type: "open-settings" }
  | { type: "open-workspace" }
  | {
      type: "open-provider-setup";
      reason: ProviderSetupState["reason"];
      pendingRequest: string | null;
    }
  | { type: "close-provider-setup" }
  | { type: "toggle-history" }
  | { type: "push-history"; entry: AiHistoryEntry }
  | {
      type: "update-history-status";
      id: string;
      status: AiHistoryEntry["status"];
    };

const initialState: AppState = {
  screen: "boot",
  settings: createDefaultSettings(),
  sessions: [],
  activeSessionId: null,
  currentPlan: null,
  pendingSubmission: null,
  planState: {
    status: "idle",
    error: null
  },
  aiHistory: [],
  historyOpen: false,
  providerSetup: {
    open: false,
    reason: "settings",
    pendingRequest: null
  }
};

function hasConfiguredProvider(settings: AppSettings): boolean {
  return settings.providers.some((provider) => provider.enabled);
}

function planToHistoryEntry(plan: ReviewedCommandPlan): AiHistoryEntry {
  return {
    id: plan.id,
    request: plan.userRequest,
    summary: plan.summary,
    commands: plan.steps.map((step) => step.command),
    risk: plan.risk,
    source: plan.source,
    status: plan.approvalState,
    providerId: plan.providerId,
    model: plan.model,
    createdAt: plan.createdAt
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "booted":
      return {
        ...state,
        screen: "workspace",
        settings: action.settings
      };
    case "set-settings":
      return {
        ...state,
        settings: action.settings,
        screen: state.screen === "settings" ? "settings" : "workspace"
      };
    case "add-session":
      return {
        ...state,
        sessions: [...state.sessions, action.session],
        activeSessionId: action.session.id
      };
    case "select-session":
      return {
        ...state,
        activeSessionId: action.sessionId
      };
    case "update-output":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                recentOutput: `${session.recentOutput}${action.data}`.slice(-12000),
                status: "ready"
              }
            : session
        )
      };
    case "session-exit":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? { ...session, status: "closed" }
            : session
        )
      };
    case "session-error":
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                status: "error",
                recentOutput: `${session.recentOutput}\r\n[PromptCLI] ${action.message}\r\n`
              }
            : session
        ),
        planState: {
          status: "failed",
          error: action.message
        }
      };
    case "set-pending-submission":
      return {
        ...state,
        currentPlan: null,
        pendingSubmission: action.submission,
        planState: { status: "idle", error: null }
      };
    case "planning":
      return {
        ...state,
        currentPlan: null,
        pendingSubmission: null,
        planState: { status: "generating", error: null }
      };
    case "plan-ready":
      return {
        ...state,
        currentPlan: action.plan,
        pendingSubmission: null,
        planState: { status: "ready", error: null }
      };
    case "plan-running":
      return {
        ...state,
        planState: { status: "running", error: null }
      };
    case "plan-error":
      return {
        ...state,
        planState: { status: "failed", error: action.error }
      };
    case "plan-cleared":
      return {
        ...state,
        currentPlan: null,
        pendingSubmission: null,
        planState: { status: "idle", error: null }
      };
    case "open-settings":
      return { ...state, screen: "settings" };
    case "open-workspace":
      return { ...state, screen: "workspace" };
    case "open-provider-setup":
      return {
        ...state,
        providerSetup: {
          open: true,
          reason: action.reason,
          pendingRequest: action.pendingRequest
        }
      };
    case "close-provider-setup":
      return {
        ...state,
        providerSetup: {
          ...state.providerSetup,
          open: false,
          pendingRequest: null
        }
      };
    case "toggle-history":
      return {
        ...state,
        historyOpen: !state.historyOpen
      };
    case "push-history":
      return {
        ...state,
        aiHistory: [action.entry, ...state.aiHistory]
      };
    case "update-history-status":
      return {
        ...state,
        aiHistory: state.aiHistory.map((entry) =>
          entry.id === action.id ? { ...entry, status: action.status } : entry
        )
      };
    default:
      return state;
  }
}

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [booting, setBooting] = useState(true);
  const [terminalFontSize, setTerminalFontSize] = useState(17);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const settings = (await loadSettings()) ?? createDefaultSettings();
        if (!cancelled) {
          dispatch({ type: "booted", settings });
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleZoomKeydown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        setTerminalFontSize((current) => Math.min(current + 1, 28));
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setTerminalFontSize((current) => Math.max(current - 1, 12));
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        setTerminalFontSize(17);
      }
    }

    window.addEventListener("keydown", handleZoomKeydown);
    return () => {
      window.removeEventListener("keydown", handleZoomKeydown);
    };
  }, []);

  useEffect(() => {
    if (state.screen === "boot" || state.sessions.length > 0) {
      return;
    }

    void createSession().then((session) => {
      dispatch({ type: "add-session", session });
    });
  }, [state.screen, state.sessions.length]);

  useEffect(() => {
    let unlistenOutput: () => void = () => undefined;
    let unlistenExit: () => void = () => undefined;
    let unlistenError: () => void = () => undefined;

    void listenSessionOutput((event) => {
      dispatch({
        type: "update-output",
        sessionId: event.sessionId,
        data: event.data
      });
    }).then((unlisten) => {
      unlistenOutput = unlisten;
    });

    void listenSessionExit((event) => {
      dispatch({ type: "session-exit", sessionId: event.sessionId });
    }).then((unlisten) => {
      unlistenExit = unlisten;
    });

    void listenSessionError((event) => {
      dispatch({
        type: "session-error",
        sessionId: event.sessionId,
        message: event.message
      });
    }).then((unlisten) => {
      unlistenError = unlisten;
    });

    return () => {
      unlistenOutput();
      unlistenExit();
      unlistenError();
    };
  }, []);

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.id === state.activeSessionId) ?? null,
    [state.activeSessionId, state.sessions]
  );

  async function handleCreateSession() {
    const session = await createSession();
    dispatch({ type: "add-session", session });
  }

  async function runShellInput(rawCommand: string) {
    if (!activeSession) {
      return;
    }

    dispatch({ type: "plan-cleared" });
    await writeSession(activeSession.id, `${rawCommand.trim()}\n`);
  }

  async function handleNaturalLanguageSubmission(
    submission: PromptSubmission,
    settingsOverride?: AppSettings
  ) {
    if (!activeSession) {
      return;
    }

    const effectiveSettings = settingsOverride ?? state.settings;
    if (!hasConfiguredProvider(effectiveSettings)) {
      dispatch({
        type: "push-history",
        entry: {
          id: crypto.randomUUID(),
          request: submission.normalizedInput,
          summary: "Provider setup is required before PromptCLI can plan English requests.",
          commands: [],
          risk: "safe",
          source: "llm",
          status: "needs_provider",
          providerId: null,
          model: null,
          createdAt: new Date().toISOString()
        }
      });
      dispatch({
        type: "open-provider-setup",
        reason: "first_nl_request",
        pendingRequest: submission.normalizedInput
      });
      return;
    }

    dispatch({ type: "planning" });

    try {
      const plan = await generateReviewedCommandPlan({
        request: submission.normalizedInput,
        session: activeSession,
        settings: effectiveSettings
      });
      dispatch({ type: "plan-ready", plan });
      dispatch({ type: "push-history", entry: planToHistoryEntry(plan) });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate a reviewed plan.";
      dispatch({ type: "plan-error", error: message });
      dispatch({
        type: "push-history",
        entry: {
          id: crypto.randomUUID(),
          request: submission.normalizedInput,
          summary: message,
          commands: [],
          risk: "safe",
          source: "llm",
          status: "failed",
          providerId: effectiveSettings.activeProviderId,
          model:
            effectiveSettings.providers.find(
              (provider) => provider.providerId === effectiveSettings.activeProviderId
            )?.defaultModel ?? null,
          createdAt: new Date().toISOString()
        }
      });
    }
  }

  async function handlePromptSubmit(value: string) {
    const normalizedValue = value.trim().toLowerCase();

    if (state.currentPlan) {
      if (normalizedValue === "no" || normalizedValue === "cancel") {
        handleCancelPlan();
        return;
      }

      if (
        (state.currentPlan.risk !== "destructive" &&
          (normalizedValue === "yes" || normalizedValue === "run")) ||
        (state.currentPlan.risk === "destructive" &&
          normalizedValue === "yes-destructive")
      ) {
        await handleApprovePlan();
        return;
      }

      dispatch({
        type: "plan-error",
        error:
          state.currentPlan.risk === "destructive"
            ? "Type yes-destructive to run or no to cancel."
            : "Type yes to run or no to cancel."
      });
      return;
    }

    if (state.pendingSubmission?.classification === "ambiguous") {
      if (normalizedValue === "shell") {
        await handleClarifyAsShell();
        return;
      }
      if (normalizedValue === "ai") {
        await handleClarifyAsNaturalLanguage();
        return;
      }
      if (normalizedValue === "cancel" || normalizedValue === "no") {
        handleCancelPlan();
        return;
      }

      dispatch({
        type: "plan-error",
        error: "Type shell to run directly, ai to plan it, or cancel."
      });
      return;
    }

    const submission = classifyPromptInput(value);
    if (!submission.normalizedInput) {
      return;
    }

    if (submission.classification === "shell") {
      await runShellInput(submission.normalizedInput);
      return;
    }

    if (submission.classification === "ambiguous") {
      dispatch({ type: "set-pending-submission", submission });
      return;
    }

    await handleNaturalLanguageSubmission(submission);
  }

  async function handleApprovePlan() {
    if (!state.currentPlan) {
      return;
    }

    dispatch({ type: "plan-running" });

    try {
      await executePlan(state.currentPlan);
      dispatch({
        type: "update-history-status",
        id: state.currentPlan.id,
        status: "approved"
      });
      dispatch({ type: "plan-cleared" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to execute the reviewed plan.";
      dispatch({ type: "plan-error", error: message });
      dispatch({
        type: "update-history-status",
        id: state.currentPlan.id,
        status: "failed"
      });
    }
  }

  function handleCancelPlan() {
    if (state.currentPlan) {
      dispatch({
        type: "update-history-status",
        id: state.currentPlan.id,
        status: "cancelled"
      });
    }
    dispatch({ type: "plan-cleared" });
  }

  async function handleClarifyAsShell() {
    if (!state.pendingSubmission) {
      return;
    }

    await runShellInput(state.pendingSubmission.normalizedInput);
  }

  async function handleClarifyAsNaturalLanguage() {
    if (!state.pendingSubmission) {
      return;
    }

    await handleNaturalLanguageSubmission({
      ...state.pendingSubmission,
      classification: "natural_language",
      override: state.pendingSubmission.override ?? "natural_language"
    });
  }

  if (booting) {
    return (
      <main className="screen boot-screen">
        <section className="panel">
          <p className="eyebrow">PromptCLI</p>
          <h1>Booting desktop workspace...</h1>
        </section>
      </main>
    );
  }

  return (
    <>
      <TerminalWorkspace
        activeSessionId={state.activeSessionId}
        currentPlan={state.currentPlan}
        onPromptSubmit={handlePromptSubmit}
        pendingSubmission={state.pendingSubmission}
        plannerBusy={
          state.planState.status === "generating" ||
          state.planState.status === "running"
        }
        plannerError={state.planState.error}
        sessions={state.sessions}
        terminalFontSize={terminalFontSize}
      />

      {state.screen === "settings" ? (
        <SettingsScreen
          onAddProvider={() =>
            dispatch({
              type: "open-provider-setup",
              reason: "settings",
              pendingRequest: null
            })
          }
          onChange={(settings) => dispatch({ type: "set-settings", settings })}
          onClose={() => dispatch({ type: "open-workspace" })}
          settings={state.settings}
        />
      ) : null}

      {state.providerSetup.open ? (
        <OnboardingScreen
          currentSettings={state.settings}
          onClose={() => dispatch({ type: "close-provider-setup" })}
          onConfigured={(settings) => {
            const pendingRequest = state.providerSetup.pendingRequest;
            dispatch({ type: "set-settings", settings });
            dispatch({ type: "close-provider-setup" });

            if (pendingRequest) {
              void handleNaturalLanguageSubmission(
                {
                  rawInput: pendingRequest,
                  normalizedInput: pendingRequest,
                  classification: "natural_language",
                  override: null
                },
                settings
              );
            }
          }}
          reason={state.providerSetup.reason}
        />
      ) : null}
    </>
  );
}
