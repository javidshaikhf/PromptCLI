import { useState } from "react";
import type { ExecutionPlan } from "../../lib/contracts";

interface PlanPreviewProps {
  plan: ExecutionPlan | null;
  busy?: boolean;
  error?: string | null;
  onApprove: () => Promise<void> | void;
  onCancel: () => void;
}

export function PlanPreview({
  plan,
  busy,
  error,
  onApprove,
  onCancel
}: PlanPreviewProps): JSX.Element | null {
  const [destructiveConfirmed, setDestructiveConfirmed] = useState(false);

  if (!plan && !error) {
    return null;
  }

  return (
    <aside className="panel plan-preview">
      <div className="space-between">
        <div>
          <p className="eyebrow">Execution plan</p>
          <h3>{plan?.summary ?? "Plan error"}</h3>
        </div>
        <button className="ghost-button" onClick={onCancel} type="button">
          Close
        </button>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      {plan ? (
        <>
          <div className="pill-row">
            <span className={`risk-pill risk-${plan.risk}`}>{plan.risk}</span>
            <span className="risk-pill neutral">Confirm before run</span>
          </div>

          <div className="stack-sm">
            <p className="muted">Request</p>
            <p>{plan.userRequest}</p>
          </div>

          {plan.assumptions.length > 0 ? (
            <div className="stack-sm">
              <p className="muted">Assumptions</p>
              <ul className="simple-list">
                {plan.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="stack-sm">
            <p className="muted">Commands</p>
            <div className="command-list">
              {plan.steps.map((step) => (
                <div className="command-card" key={step.id}>
                  <strong>{step.title}</strong>
                  <p className="muted">{step.rationale}</p>
                  <code>{step.command}</code>
                </div>
              ))}
            </div>
          </div>

          {plan.risk === "destructive" ? (
            <label className="checkbox-row">
              <input
                checked={destructiveConfirmed}
                onChange={(event) =>
                  setDestructiveConfirmed(event.target.checked)
                }
                type="checkbox"
              />
              <span>I understand this plan may be destructive.</span>
            </label>
          ) : null}

          <div className="button-row">
            <button className="ghost-button" onClick={onCancel} type="button">
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={() => void onApprove()}
              disabled={busy || (plan.risk === "destructive" && !destructiveConfirmed)}
              type="button"
            >
              {busy ? "Running..." : "Approve and run"}
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
}

