import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { ShellSession } from "../../lib/contracts";

interface TerminalViewProps {
  session: ShellSession;
  auxiliaryOutput?: string;
  children?: ReactNode;
  fontSize?: number;
}

const HIDDEN_PROMPT_SENTINEL = "__PROMPTCLI_PROMPT__";

function normalizeTranscript(output: string): string {
  const clearMarkers = [...output.matchAll(/\u001bc|\u001b\[2J|\u001b\[3J/g)];
  const lastClearMarker = clearMarkers.at(-1);
  const relevantOutput =
    lastClearMarker && lastClearMarker.index !== undefined
      ? output.slice(lastClearMarker.index + lastClearMarker[0].length)
      : output;

  return relevantOutput
    .replaceAll(HIDDEN_PROMPT_SENTINEL, "")
    .replace(/\u001b\][^\u0007]*\u0007/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-_]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\s+/, "");
}

export function TerminalView({
  session,
  auxiliaryOutput = "",
  fontSize = 17,
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
      <div className="terminal-stream" style={{ fontSize: `${fontSize}px` }}>
        <span className="terminal-transcript">{combinedOutput}</span>
        {children}
      </div>
    </div>
  );
}
