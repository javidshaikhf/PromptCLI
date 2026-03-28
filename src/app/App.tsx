import { useEffect, useMemo, useReducer, useState } from "react";
import type {
  AppScreen,
  AppSettings,
  ExecutionPlan,
  PlanExecutionState,
  ShellSession
} from "../lib/contracts";
import {
  createSession,
  executePlan,
  listenSessionError,
  listenSessionExit,
  listenSessionOutput,
  loadSettings
} from "../lib/tauri/bridge";
import { generateExecutionPlan } from "../lib/planner";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { TerminalWorkspace } from "../features/terminal/TerminalWorkspace";

interface AppState {
  screen: AppScreen;
  settings: AppSettings | null;
  sessions: ShellSession[];
  activeSessionId: string | null;
  currentPlan: ExecutionPlan | null;
  planState: PlanExecutionState;
}

type Action =
  | { type: "booted"; settings: AppSettings | null }
  | { type: "set-settings"; settings: AppSettings }
  | { type: "add-session"; session: ShellSession }
  | { type: "select-session"; sessionId: string }
  | { type: "update-output"; sessionId: string; data: string }
  | { type: "session-exit"; sessionId: string }
  | { type: "session-error"; sessionId: string; message: string }
  | { type: "planning" }
  | { type: "plan-ready"; plan: ExecutionPlan }
  | { type: "plan-error"; error: string }
  | { type: "plan-cleared" }
  | { type: "plan-running" }
  | { type: "open-settings" }
  | { type: "open-workspace" };

const initialState: AppState = {
  screen: "boot",
  settings: null,
  sessions: [],
  activeSessionId: null,
  currentPlan: null,
  planState: {
    status: "idle",
    error: null
  }
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "booted":
      return {
        ...state,
        screen:
          action.settings && action.settings.providers.some((provider) => provider.enabled)
            ? "workspace"
            : "onboarding",
        settings: action.settings
      };
    case "set-settings":
      return {
        ...state,
        settings: action.settings,
        screen: "workspace"
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
    case "planning":
      return {
        ...state,
        currentPlan: null,
        planState: { status: "generating", error: null }
      };
    case "plan-ready":
      return {
        ...state,
        currentPlan: action.plan,
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
        currentPlan: null,
        planState: { status: "failed", error: action.error }
      };
    case "plan-cleared":
      return {
        ...state,
        currentPlan: null,
        planState: { status: "idle", error: null }
      };
    case "open-settings":
      return { ...state, screen: "settings" };
    case "open-workspace":
      return { ...state, screen: "workspace" };
    default:
      return state;
  }
}

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const settings = await loadSettings();
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
    if (state.screen !== "workspace" || !state.settings || state.sessions.length > 0) {
      return;
    }

    void createSession().then((session) => {
      dispatch({ type: "add-session", session });
    });
  }, [state.screen, state.settings, state.sessions.length]);

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

  async function handlePromptSubmit(value: string) {
    if (!activeSession || !state.settings) {
      return;
    }

    dispatch({ type: "planning" });

    try {
      const plan = await generateExecutionPlan({
        request: value,
        session: activeSession,
        settings: state.settings
      });
      dispatch({ type: "plan-ready", plan });
    } catch (error) {
      dispatch({
        type: "plan-error",
        error: error instanceof Error ? error.message : "Failed to generate a plan."
      });
    }
  }

  async function handleApprovePlan() {
    if (!state.currentPlan) {
      return;
    }

    dispatch({ type: "plan-running" });
    try {
      await executePlan(state.currentPlan);
      dispatch({ type: "plan-cleared" });
    } catch (error) {
      dispatch({
        type: "plan-error",
        error: error instanceof Error ? error.message : "Failed to execute plan."
      });
    }
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

  if (state.screen === "onboarding" || !state.settings) {
    return (
      <OnboardingScreen
        onConfigured={(settings) => dispatch({ type: "set-settings", settings })}
      />
    );
  }

  return (
    <>
      <TerminalWorkspace
        activeSessionId={state.activeSessionId}
        currentPlan={state.currentPlan}
        onApprovePlan={handleApprovePlan}
        onCancelPlan={() => dispatch({ type: "plan-cleared" })}
        onCreateSession={handleCreateSession}
        onOpenSettings={() => dispatch({ type: "open-settings" })}
        onPromptSubmit={handlePromptSubmit}
        onSelectSession={(sessionId) =>
          dispatch({ type: "select-session", sessionId })
        }
        plannerBusy={
          state.planState.status === "generating" ||
          state.planState.status === "running"
        }
        plannerError={state.planState.error}
        sessions={state.sessions}
      />

      {state.screen === "settings" ? (
        <SettingsScreen
          onChange={(settings) => dispatch({ type: "set-settings", settings })}
          onClose={() => dispatch({ type: "open-workspace" })}
          settings={state.settings}
        />
      ) : null}
    </>
  );
}
