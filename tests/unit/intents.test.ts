import { describe, expect, it } from "vitest";
import { buildIntentPlan } from "../../src/lib/intents/builders";
import { matchIntent } from "../../src/lib/intents/matchers";
import type { ShellSession } from "../../src/lib/contracts";

const session: ShellSession = {
  id: "session-1",
  tabTitle: "Tab 1",
  cwd: "/workspace",
  shell: "/bin/zsh",
  os: "macos",
  status: "ready",
  recentOutput: ""
};

describe("intent matching", () => {
  it("detects git push requests", () => {
    const result = matchIntent("push it to github");
    expect(result.matchedIntent).toBe("git.push");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("builds a local execution plan for git push", () => {
    const plan = buildIntentPlan(session, "git.push", "push it to github");
    expect(plan?.summary).toContain("Push");
    expect(plan?.steps).toHaveLength(2);
    expect(plan?.steps[1]?.command).toContain("git push");
  });
});

