import type { ExecutionPlan, ShellSession } from "../contracts";

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
  assumptions: string[] = []
): ExecutionPlan {
  return {
    id: crypto.randomUUID(),
    sessionId: session.id,
    userRequest,
    summary,
    risk: "safe",
    requiresConfirmation: true,
    assumptions,
    missingInputs: [],
    steps
  };
}

export function buildIntentPlan(
  session: ShellSession,
  intent: string,
  userRequest: string
): ExecutionPlan | null {
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
            "rg --line-number TODO ."
          )
        ],
        ["Uses TODO as a placeholder search term when the request does not specify one."]
      );
    case "process.list":
      return buildBasePlan(session, userRequest, "List running processes.", [
        step("process-list", "Show processes", "Inspect active processes.", "ps aux")
      ]);
    case "package.run":
      return buildBasePlan(session, userRequest, "Run the app's development command.", [
        step("package-run", "Start app", "Use the common npm start script.", "npm run dev")
      ]);
    case "package.install":
      return buildBasePlan(session, userRequest, "Install project dependencies.", [
        step(
          "package-install",
          "Install packages",
          "Install dependencies for the current project.",
          "npm install"
        )
      ]);
    default:
      return null;
  }
}

