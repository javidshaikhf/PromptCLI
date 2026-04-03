import type { InputClassification, PromptSubmission } from "../contracts";

const shellCommands = new Set([
  "git",
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "ls",
  "cd",
  "cat",
  "mkdir",
  "rm",
  "mv",
  "cp",
  "pwd",
  "echo",
  "touch",
  "rg",
  "grep",
  "find",
  "ps",
  "kill",
  "killall",
  "node",
  "python",
  "python3",
  "pip",
  "cargo",
  "rustup",
  "brew",
  "make",
  "clear",
  "open",
  "code",
  "chmod",
  "chown"
]);

const ambiguousTerms = new Set([
  "status",
  "build",
  "install",
  "start",
  "test",
  "run",
  "logs",
  "deploy"
]);

const naturalLanguageIndicators = [
  /^(hi|hello|hey)\b/i,
  /\bplease\b/i,
  /\bcan you\b/i,
  /\bhow do i\b/i,
  /\bpush it\b/i,
  /\bfind all\b/i,
  /\bsearch for\b/i,
  /\bdelete the\b/i,
  /\bcreate a\b/i,
  /\blook for\b/i,
  /\bset up\b/i
];

function classifyCore(input: string): InputClassification {
  const trimmed = input.trim();
  if (!trimmed) {
    return "ambiguous";
  }

  if (
    /^[A-Za-z_][A-Za-z0-9_]*=/.test(trimmed) ||
    /[|><;&]/.test(trimmed) ||
    /^(\.\/|\.\.\/|\/|~\/)/.test(trimmed)
  ) {
    return "shell";
  }

  const firstToken = trimmed.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (shellCommands.has(firstToken)) {
    return "shell";
  }

  if (naturalLanguageIndicators.some((pattern) => pattern.test(trimmed))) {
    return "natural_language";
  }

  if (/[?.!]$/.test(trimmed) || /\b(to|for|with|from|into|all|this|that)\b/i.test(trimmed)) {
    return "natural_language";
  }

  const lowered = trimmed.toLowerCase();
  if (ambiguousTerms.has(lowered) || trimmed.split(/\s+/).length <= 2) {
    return "ambiguous";
  }

  return "natural_language";
}

export function classifyPromptInput(rawInput: string): PromptSubmission {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith("!")) {
    return {
      rawInput,
      normalizedInput: trimmed.slice(1).trim(),
      classification: "shell",
      override: "shell"
    };
  }

  if (trimmed.startsWith("?")) {
    return {
      rawInput,
      normalizedInput: trimmed.slice(1).trim(),
      classification: "natural_language",
      override: "natural_language"
    };
  }

  return {
    rawInput,
    normalizedInput: trimmed,
    classification: classifyCore(trimmed),
    override: null
  };
}
