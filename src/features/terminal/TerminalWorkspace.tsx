import type {
  PromptSubmission,
  ReviewedCommandPlan,
  ShellSession
} from "../../lib/contracts";
import { PromptComposer } from "../promptcli/PromptComposer";
import { TerminalView } from "./TerminalView";

interface TerminalWorkspaceProps {
  sessions: ShellSession[];
  activeSessionId: string | null;
  currentPlan: ReviewedCommandPlan | null;
  pendingSubmission: PromptSubmission | null;
  plannerBusy: boolean;
  plannerError: string | null;
  onPromptSubmit: (value: string) => Promise<void>;
  terminalFontSize: number;
}

export function TerminalWorkspace({
  sessions,
  activeSessionId,
  currentPlan,
  pendingSubmission,
  plannerBusy,
  plannerError,
  onPromptSubmit,
  terminalFontSize
}: TerminalWorkspaceProps): JSX.Element {
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  const auxiliaryOutput = currentPlan
    ? [
        "\r\n[promptcli] review",
        `[promptcli] ${currentPlan.summary}`,
        `[promptcli] request: ${currentPlan.userRequest}`,
        ...currentPlan.steps.map((step) => `[promptcli] ${step.command}`),
        ...currentPlan.assumptions.map(
          (assumption) => `[promptcli] assumption: ${assumption}`
        ),
        currentPlan.risk === "destructive"
          ? "[promptcli] type yes-destructive to run or no to cancel"
          : "[promptcli] type yes to run or no to cancel",
        plannerError ? `[promptcli] error: ${plannerError}` : ""
      ]
        .filter(Boolean)
        .join("\r\n") + "\r\n"
    : pendingSubmission?.classification === "ambiguous"
      ? [
          "\r\n[promptcli] clarify",
          `[promptcli] ${pendingSubmission.normalizedInput}`,
          "[promptcli] type shell to run directly, ai to plan it, or cancel",
          plannerError ? `[promptcli] error: ${plannerError}` : ""
        ]
          .filter(Boolean)
          .join("\r\n") + "\r\n"
      : plannerError
        ? `\r\n[promptcli] error: ${plannerError}\r\n`
        : "";

  return (
    <main className="workspace">
      <section className="terminal-shell">
        {activeSession ? (
          <TerminalView
            auxiliaryOutput={auxiliaryOutput}
            fontSize={terminalFontSize}
            session={activeSession}
          >
            <PromptComposer
              busy={plannerBusy}
              cwd={activeSession.cwd}
              disabled={!activeSession}
              onSubmit={onPromptSubmit}
            />
          </TerminalView>
        ) : (
          <div className="empty-state">
            <p>No terminal session available.</p>
          </div>
        )}
      </section>
    </main>
  );
}
