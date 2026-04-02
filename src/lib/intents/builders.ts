import type { ExecutionPlan, IntentResult, ShellSession } from "../contracts";

function step(id: string, title: string, rationale: string, command: string) {
  return {
    id,
    kind: "shell" as const,
    title,
    rationale,
    command,
    cwdPolicy: "session" as const
  };
}

function buildBasePlan(
  session: ShellSession,
  userRequest: string,
  summary: string,
  steps: ExecutionPlan["steps"],
  assumptions: string[] = [],
  missingInputs: string[] = []
): ExecutionPlan {
  return {
    id: crypto.randomUUID(),
    sessionId: session.id,
    userRequest,
    summary,
    risk: "safe",
    requiresConfirmation: true,
    assumptions,
    missingInputs,
    steps
  };
}

function extractQuotedTarget(input: string): string | null {
  const quoted = input.match(/["']([^"']+)["']/);
  if (quoted) {
    return quoted[1];
  }

  const tail = input.match(/\b(?:named|called|for|to|from|directory|folder|file)\s+([A-Za-z0-9._/-]+)/i);
  return tail?.[1] ?? null;
}

function extractSearchTerm(input: string): string | null {
  const quoted = extractQuotedTarget(input);
  if (quoted) {
    return quoted;
  }
  if (/\bTODOs?\b/i.test(input)) {
    return "TODO";
  }
  const direct = input.match(/\b(?:find|search for|look for|grep)\s+([A-Za-z0-9._-]+)/i);
  return direct?.[1] ?? null;
}

function sanitizeTarget(target: string | null): string | null {
  return target?.replace(/["']/g, "").trim() || null;
}

export function buildIntentPlan(
  session: ShellSession,
  intent: NonNullable<IntentResult["matchedIntent"]>,
  userRequest: string
): ExecutionPlan | null {
  const quotedTarget = sanitizeTarget(extractQuotedTarget(userRequest));
  const searchTerm = sanitizeTarget(extractSearchTerm(userRequest));

  switch (intent) {
    case "git.push":
      return buildBasePlan(
        session,
        userRequest,
        "Push the current branch to the default remote.",
        [
          step("git-status", "Inspect working tree", "Confirm repo state.", "git status --short"),
          step(
            "git-push",
            "Push branch",
            "Publish the current branch to origin.",
            "git push origin HEAD"
          )
        ],
        ["Assumes the current repository uses origin as the remote."]
      );
    case "git.pull":
      return buildBasePlan(session, userRequest, "Pull the latest changes.", [
        step("git-pull", "Pull latest", "Update the current branch.", "git pull --ff-only")
      ]);
    case "git.status":
      return buildBasePlan(session, userRequest, "Show repository status.", [
        step("git-status", "Show status", "Inspect the current git state.", "git status")
      ]);
    case "search.text":
      return buildBasePlan(
        session,
        userRequest,
        "Search the current project for matching text.",
        [
          step(
            "search-rg",
            "Search files",
            "Use ripgrep for a fast recursive search.",
            `rg --line-number ${searchTerm ?? "TODO"} .`
          )
        ],
        searchTerm
          ? []
          : ["Uses TODO as a placeholder search term when the request does not specify one."]
      );
    case "file.mkdir":
      return buildBasePlan(
        session,
        userRequest,
        "Create a directory in the current working tree.",
        [
          step(
            "mkdir",
            "Create directory",
            "Create the requested directory.",
            `mkdir -p ${quotedTarget ?? "new-folder"}`
          )
        ],
        quotedTarget ? [] : ["Uses new-folder as a placeholder when a directory name is not provided."],
        quotedTarget ? [] : ["directory name"]
      );
    case "file.delete":
      return buildBasePlan(
        session,
        userRequest,
        "Delete the requested file or directory.",
        [
          step(
            "delete-target",
            "Delete target",
            "Remove the requested file or directory.",
            `rm -rf ${quotedTarget ?? "target-path"}`
          )
        ],
        quotedTarget ? [] : ["Uses target-path as a placeholder when the delete target is unclear."],
        quotedTarget ? [] : ["target path"]
      );
    case "file.copy":
      return buildBasePlan(
        session,
        userRequest,
        "Copy a file or directory.",
        [
          step(
            "copy-target",
            "Copy target",
            "Copy the requested source into a new location.",
            "cp -R source-path destination-path"
          )
        ],
        ["Uses placeholder source and destination paths when the request is underspecified."],
        ["source path", "destination path"]
      );
    case "file.move":
      return buildBasePlan(
        session,
        userRequest,
        "Move or rename a file or directory.",
        [
          step(
            "move-target",
            "Move target",
            "Move the requested source into a new location.",
            "mv source-path destination-path"
          )
        ],
        ["Uses placeholder source and destination paths when the request is underspecified."],
        ["source path", "destination path"]
      );
    case "process.list":
      return buildBasePlan(session, userRequest, "List running processes.", [
        step("process-list", "Show processes", "Inspect active processes.", "ps aux")
      ]);
    case "process.kill":
      return buildBasePlan(
        session,
        userRequest,
        "Stop a running process.",
        [
          step(
            "kill-process",
            "Kill process",
            "Stop the requested process by PID.",
            "kill PID"
          )
        ],
        ["Uses a PID placeholder when the request does not specify one."],
        ["process id"]
      );
    case "package.run":
      return buildBasePlan(session, userRequest, "Run the app's development command.", [
        step(
          "package-run",
          "Start app",
          "Run the most likely npm script for the request.",
          /\bstart\b/i.test(userRequest) ? "npm start" : "npm run dev"
        )
      ]);
    case "package.install":
      return buildBasePlan(session, userRequest, "Install project dependencies.", [
        step(
          "package-install",
          "Install packages",
          "Install dependencies for the current project.",
          `npm install${quotedTarget ? ` ${quotedTarget}` : ""}`
        )
      ]);
    default:
      return null;
  }
}
