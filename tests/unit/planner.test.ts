import { describe, expect, it } from "vitest";
import { normalizeExecutionPlan } from "../../src/lib/planner/normalize";

describe("plan normalization", () => {
  it("fills required defaults when a provider omits fields", () => {
    const plan = normalizeExecutionPlan("session-1", "show status", {
      summary: "Show repo status",
      steps: [
        {
          id: "step-1",
          kind: "shell",
          title: "",
          rationale: "",
          command: "git status",
          cwdPolicy: "session"
        }
      ]
    });

    expect(plan.sessionId).toBe("session-1");
    expect(plan.userRequest).toBe("show status");
    expect(plan.steps[0]?.title).toBe("Step 1");
    expect(plan.requiresConfirmation).toBe(true);
  });
});
