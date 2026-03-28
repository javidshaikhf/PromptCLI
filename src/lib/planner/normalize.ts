import type { ExecutionPlan } from "../contracts";

export function normalizeExecutionPlan(
  sessionId: string,
  request: string,
  input: Partial<ExecutionPlan>
): ExecutionPlan {
  return {
    id: input.id ?? crypto.randomUUID(),
    sessionId: input.sessionId ?? sessionId,
    userRequest: input.userRequest ?? request,
    summary: input.summary ?? "Review and execute the requested shell plan.",
    risk: input.risk ?? "safe",
    requiresConfirmation: true,
    assumptions: Array.isArray(input.assumptions) ? input.assumptions : [],
    missingInputs: Array.isArray(input.missingInputs) ? input.missingInputs : [],
    steps: Array.isArray(input.steps)
      ? input.steps.map((step, index) => ({
          id: step.id ?? `step-${index + 1}`,
          kind: step.kind ?? "shell",
          title: step.title || `Step ${index + 1}`,
          rationale: step.rationale || "No rationale provided.",
          command: step.command || "",
          cwdPolicy: step.cwdPolicy ?? "session"
        }))
      : []
  };
}
