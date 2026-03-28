import type { AppSettings, ExecutionPlan, PlannerInput } from "../contracts";
import { buildIntentPlan } from "../intents/builders";
import { matchIntent } from "../intents/matchers";
import { classifyPlanRisk } from "../policy/risk";
import { getProviderAdapter } from "../providers";
import { normalizeExecutionPlan } from "./normalize";
import { getProviderKey } from "../tauri/bridge";

function getActiveProvider(settings: AppSettings) {
  return settings.providers.find(
    (provider) =>
      provider.enabled && provider.providerId === settings.activeProviderId
  );
}

export async function generateExecutionPlan(
  input: PlannerInput
): Promise<ExecutionPlan> {
  const intent = matchIntent(input.request);

  if (intent.matchedIntent && intent.confidence >= 0.85) {
    const localPlan = buildIntentPlan(
      input.session,
      intent.matchedIntent,
      input.request
    );

    if (localPlan) {
      localPlan.risk = classifyPlanRisk(localPlan);
      return localPlan;
    }
  }

  const activeProvider = getActiveProvider(input.settings);
  if (!activeProvider) {
    throw new Error("Configure a provider before generating a plan.");
  }

  const apiKey = await getProviderKey(activeProvider.providerId);
  if (!apiKey) {
    throw new Error("Provider API key was not found in secure storage.");
  }

  const provider = getProviderAdapter(activeProvider.providerId);
  const planned = await provider.generatePlan({
    providerId: activeProvider.providerId,
    model: activeProvider.defaultModel,
    apiKey,
    request: input.request,
    session: {
      id: input.session.id,
      cwd: input.session.cwd,
      shell: input.session.shell,
      os: input.session.os,
      recentOutput: input.session.recentOutput.slice(-4000)
    }
  });

  const normalized = normalizeExecutionPlan(
    input.session.id,
    input.request,
    planned
  );
  normalized.risk = classifyPlanRisk(normalized);
  return normalized;
}

