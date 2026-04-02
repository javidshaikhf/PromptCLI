import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { ShellSession } from "../../lib/contracts";

interface TerminalViewProps {
  session: ShellSession;
  auxiliaryOutput?: string;
  children?: ReactNode;
}

function normalizeTranscript(output: string): string {
  return output
    .replace(/\u001b\][^\u0007]*\u0007/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-_]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export function TerminalView({
  session,
  auxiliaryOutput = "",
  children
}: TerminalViewProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const combinedOutput = useMemo(
    () => normalizeTranscript(`${session.recentOutput}${auxiliaryOutput}`),
    [auxiliaryOutput, session.recentOutput]
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [combinedOutput, children]);

  return (
    <div className="terminal-surface" ref={scrollRef}>
      <div className="terminal-stream">
        <span className="terminal-transcript">{combinedOutput}</span>
        {children}
      </div>
    </div>
  );
}
