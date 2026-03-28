import { describe, expect, it } from "vitest";
import { classifyCommandRisk, classifyPlanRisk } from "../../src/lib/policy/risk";
import type { ExecutionPlan } from "../../src/lib/contracts";

describe("risk classification", () => {
  it("marks force push as destructive", () => {
    expect(classifyCommandRisk("git push origin HEAD --force")).toBe("destructive");
  });

  it("bubbles the highest risk across a plan", () => {
    const plan: ExecutionPlan = {
      id: "plan-1",
      sessionId: "session-1",
      userRequest: "delete build artifacts",
      summary: "Delete files",
      risk: "safe",
      requiresConfirmation: true,
      assumptions: [],
      missingInputs: [],
      steps: [
        {
          id: "step-1",
          kind: "shell",
          title: "Inspect",
          rationale: "Inspect files first",
          command: "ls",
          cwdPolicy: "session"
        },
        {
          id: "step-2",
          kind: "shell",
          title: "Delete",
          rationale: "Remove files",
          command: "rm -rf dist",
          cwdPolicy: "session"
        }
      ]
    };

    expect(classifyPlanRisk(plan)).toBe("destructive");
  });
});

