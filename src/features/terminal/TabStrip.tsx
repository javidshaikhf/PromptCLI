import type { ShellSession } from "../../lib/contracts";

interface TabStripProps {
  sessions: ShellSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewTab: () => void;
  onOpenSettings: () => void;
}

export function TabStrip({
  sessions,
  activeSessionId,
  onSelect,
  onNewTab,
  onOpenSettings
}: TabStripProps): JSX.Element {
  return (
    <header className="tab-strip">
      <div className="tab-list">
        {sessions.map((session) => (
          <button
            key={session.id}
            className={`tab-button ${session.id === activeSessionId ? "is-active" : ""}`}
            onClick={() => onSelect(session.id)}
            type="button"
          >
            {session.tabTitle}
          </button>
        ))}
        <button className="ghost-button" onClick={onNewTab} type="button">
          + New tab
        </button>
      </div>
      <button className="ghost-button" onClick={onOpenSettings} type="button">
        Settings
      </button>
    </header>
  );
}

