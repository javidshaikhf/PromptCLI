import { type FormEvent, useState } from "react";

interface PromptBarProps {
  disabled?: boolean;
  busy?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
}

export function PromptBar({
  disabled,
  busy,
  onSubmit
}: PromptBarProps): JSX.Element {
  const [value, setValue] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }

    await onSubmit(value.trim());
    setValue("");
  }

  return (
    <form className="prompt-bar" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">PromptCLI</p>
        <p className="muted">Describe what you want to do in the active tab.</p>
      </div>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder='Try "push it to github" or "find all TODOs in this project"'
        disabled={disabled || busy}
      />
      <button
        className="primary-button"
        disabled={disabled || busy || !value.trim()}
      >
        {busy ? "Planning..." : "Plan command"}
      </button>
    </form>
  );
}
