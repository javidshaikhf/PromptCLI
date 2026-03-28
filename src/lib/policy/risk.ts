import type { ExecutionPlan, PlanRisk } from "../contracts";

const destructivePatterns = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/s\b/i,
  /\bformat\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+push\b.*--force/i,
  /\bkillall\b/i
];

const elevatedPatterns = [
  /\bnpm\s+install\b/i,
  /\bpnpm\s+add\b/i,
  /\byarn\s+add\b/i,
  /\bpip\s+install\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+pull\b/i,
  /\bmv\b/i,
  /\bcp\b/i,
  /\bmkdir\b/i,
  /\bkill\b/i
];

export function classifyCommandRisk(command: string): PlanRisk {
  if (destructivePatterns.some((pattern) => pattern.test(command))) {
    return "destructive";
  }

  if (elevatedPatterns.some((pattern) => pattern.test(command))) {
    return "elevated";
  }

  return "safe";
}

export function classifyPlanRisk(plan: ExecutionPlan): PlanRisk {
  return plan.steps.reduce<PlanRisk>((highest, step) => {
    const risk = classifyCommandRisk(step.command);

    if (risk === "destructive" || highest === "destructive") {
      return "destructive";
    }

    if (risk === "elevated" || highest === "elevated") {
      return "elevated";
    }

    return "safe";
  }, "safe");
}

