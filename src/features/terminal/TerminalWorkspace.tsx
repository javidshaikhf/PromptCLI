import type { ExecutionPlan, ShellSession } from "../../lib/contracts";
import { PlanPreview } from "../promptcli/PlanPreview";
import { PromptBar } from "../promptcli/PromptBar";
import { TabStrip } from "./TabStrip";
import { TerminalView } from "./TerminalView";

interface TerminalWorkspaceProps {
  sessions: ShellSession[];
  activeSessionId: string | null;
  currentPlan: ExecutionPlan | null;
  plannerBusy: boolean;
  plannerError: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => Promise<void> | void;
  onPromptSubmit: (value: string) => Promise<void>;
  onApprovePlan: () => Promise<void>;
  onCancelPlan: () => void;
  onOpenSettings: () => void;
}

export function TerminalWorkspace({
  sessions,
  activeSessionId,
  currentPlan,
  plannerBusy,
  plannerError,
  onSelectSession,
  onCreateSession,
  onPromptSubmit,
  onApprovePlan,
  onCancelPlan,
  onOpenSettings
}: TerminalWorkspaceProps): JSX.Element {
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  return (
    <main className="workspace">
      <TabStrip
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={onSelectSession}
        onNewTab={() => void onCreateSession()}
        onOpenSettings={onOpenSettings}
      />

      <section className="workspace-body">
        <div className="terminal-column">
          {activeSession ? (
            <>
              <TerminalView session={activeSession} />
              <div className="status-bar">
                <span>Shell: {activeSession.shell}</span>
                <span>CWD: {activeSession.cwd}</span>
                <span>Status: {activeSession.status}</span>
              </div>
            </>
          ) : (
            <div className="empty-state panel">
              <h2>No terminal tabs yet</h2>
              <p className="muted">
                Create a tab to start a real shell session and use PromptCLI on
                top of it.
              </p>
            </div>
          )}

          <PromptBar
            busy={plannerBusy}
            disabled={!activeSession}
            onSubmit={onPromptSubmit}
          />
        </div>

        <PlanPreview
          busy={plannerBusy}
          error={plannerError}
          onApprove={onApprovePlan}
          onCancel={onCancelPlan}
          plan={currentPlan}
        />
      </section>
    </main>
  );
}

