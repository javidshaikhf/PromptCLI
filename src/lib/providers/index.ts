import type { ProviderId } from "../contracts";
import { anthropicAdapter } from "./anthropic";
import { openAIAdapter } from "./openai";
import type { ProviderAdapter } from "./types";

const providers: Record<ProviderId, ProviderAdapter> = {
  openai: openAIAdapter,
  anthropic: anthropicAdapter
};

export function getProviderAdapter(providerId: ProviderId): ProviderAdapter {
  return providers[providerId];
}

export function listProviderAdapters(): ProviderAdapter[] {
  return Object.values(providers);
}

