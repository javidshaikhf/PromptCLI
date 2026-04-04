import { type FormEvent, useEffect, useRef, useState } from "react";

interface PromptComposerProps {
  busy?: boolean;
  cwd?: string;
  disabled?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
}

function formatPromptPath(cwd?: string): string {
  const trimmed = cwd?.trim();
  if (!trimmed) {
    return "/";
  }

  return trimmed;
}

export function PromptComposer({
  busy,
  cwd,
  disabled,
  onSubmit
}: PromptComposerProps): JSX.Element {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayPath = formatPromptPath(cwd);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }

    await onSubmit(value);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form className="prompt-composer" onSubmit={handleSubmit}>
      <div className="prompt-path-line" title={cwd || displayPath}>
        {displayPath}
      </div>
      <div className="prompt-input-row">
        <span className="prompt-marker" aria-hidden="true">
          &gt;
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder=""
          disabled={disabled || busy}
        />
      </div>
    </form>
  );
}
