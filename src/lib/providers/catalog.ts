import type { ModelOption, ProviderId } from "../contracts";

export const MODEL_CATALOG: Record<ProviderId, ModelOption[]> = {
  openai: [
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", providerId: "openai" },
    { id: "gpt-4.1", label: "GPT-4.1", providerId: "openai" }
  ],
  anthropic: [
    {
      id: "claude-3-5-sonnet-latest",
      label: "Claude 3.5 Sonnet",
      providerId: "anthropic"
    },
    {
      id: "claude-3-5-haiku-latest",
      label: "Claude 3.5 Haiku",
      providerId: "anthropic"
    }
  ]
};

