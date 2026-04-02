import { type FormEvent, useEffect, useRef, useState } from "react";

interface PromptComposerProps {
  busy?: boolean;
  disabled?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
}

export function PromptComposer({
  busy,
  disabled,
  onSubmit
}: PromptComposerProps): JSX.Element {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    </form>
  );
}
