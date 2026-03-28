import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { ShellSession } from "../../lib/contracts";
import { resizeSession, writeSession } from "../../lib/tauri/bridge";

interface TerminalViewProps {
  session: ShellSession;
}

export function TerminalView({ session }: TerminalViewProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const renderedOutputRef = useRef("");

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const terminal = new Terminal({
      convertEol: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 14,
      theme: {
        background: "#07111f",
        foreground: "#e5eef9",
        cursor: "#ffd166",
        selectionBackground: "#163255"
      }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(hostRef.current);
    fitAddon.fit();
    terminal.write(session.recentOutput);
    renderedOutputRef.current = session.recentOutput;

    terminal.onData((data) => {
      void writeSession(session.id, data);
    });

    void resizeSession(session.id, terminal.cols, terminal.rows);

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      void resizeSession(session.id, terminal.cols, terminal.rows);
    });
    resizeObserver.observe(hostRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [session.id]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    if (session.recentOutput.startsWith(renderedOutputRef.current)) {
      const delta = session.recentOutput.slice(renderedOutputRef.current.length);
      if (delta) {
        terminal.write(delta);
      }
    } else {
      terminal.reset();
      terminal.write(session.recentOutput);
      fitAddonRef.current?.fit();
    }

    renderedOutputRef.current = session.recentOutput;
  }, [session.id, session.recentOutput]);

  return <div className="terminal-surface" ref={hostRef} />;
}
