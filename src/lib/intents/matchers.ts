import type { IntentResult } from "../contracts";

const intentPatterns: Array<{
  intent: NonNullable<IntentResult["matchedIntent"]>;
  confidence: number;
  patterns: RegExp[];
}> = [
  {
    intent: "git.push",
    confidence: 0.95,
    patterns: [/push .*github/i, /\bgit push\b/i, /\bpush it\b/i]
  },
  {
    intent: "git.pull",
    confidence: 0.95,
    patterns: [/\bgit pull\b/i, /\bpull latest\b/i]
  },
  {
    intent: "git.status",
    confidence: 0.9,
    patterns: [/\bgit status\b/i, /\bwhat changed\b/i, /\brepo status\b/i]
  },
  {
    intent: "file.copy",
    confidence: 0.8,
    patterns: [/\bcopy\b/i]
  },
  {
    intent: "file.move",
    confidence: 0.8,
    patterns: [/\bmove\b/i, /\brename\b/i]
  },
  {
    intent: "file.delete",
    confidence: 0.8,
    patterns: [/\bdelete\b/i, /\bremove\b/i]
  },
  {
    intent: "file.mkdir",
    confidence: 0.8,
    patterns: [/\bmake (a )?folder\b/i, /\bcreate (a )?directory\b/i, /\bcreate (a )?folder\b/i]
  },
  {
    intent: "search.text",
    confidence: 0.9,
    patterns: [/\bfind\b/i, /\bsearch\b/i, /\bgrep\b/i]
  },
  {
    intent: "process.list",
    confidence: 0.85,
    patterns: [/\blist processes\b/i, /\bshow running processes\b/i]
  },
  {
    intent: "process.kill",
    confidence: 0.85,
    patterns: [/\bkill\b/i, /\bstop process\b/i]
  },
  {
    intent: "package.install",
    confidence: 0.9,
    patterns: [/\binstall package\b/i, /\bnpm install\b/i, /\badd dependency\b/i, /\binstall\b.+\bpackage\b/i]
  },
  {
    intent: "package.run",
    confidence: 0.85,
    patterns: [/\brun dev server\b/i, /\bstart the app\b/i, /\bnpm run\b/i]
  }
];

export function matchIntent(input: string): IntentResult {
  const normalized = input.trim().toLowerCase();

  for (const candidate of intentPatterns) {
    if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        matchedIntent: candidate.intent,
        confidence: candidate.confidence,
        missingInputs: []
      };
    }
  }

  return {
    matchedIntent: null,
    confidence: 0,
    missingInputs: []
  };
}
