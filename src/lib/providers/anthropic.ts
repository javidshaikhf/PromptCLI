import type {
  ExecutionPlan,
  ModelOption,
  ProviderValidationInput
} from "../contracts";
import { MODEL_CATALOG } from "./catalog";
import type { ProviderAdapter, ProviderPlanRequest } from "./types";

const SYSTEM_PROMPT = [
  "You are PromptCLI's planning model.",
  "Return strict JSON only with no markdown fences.",
  "Build a shell execution plan and never assume execution happens automatically."
].join(" ");

const REQUEST_TIMEOUT_MS = 15000;

async function callAnthropic(
  apiKey: string,
  body: Record<string, unknown>
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Anthropic request timed out. Check your network and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        item.type === "text" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
        return item.text;
      }
      return "";
    })
    .join("\n")
    .trim();
}

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  listSupportedModels(): ModelOption[] {
    return MODEL_CATALOG.anthropic;
  },
  async validateKey(input: ProviderValidationInput): Promise<void> {
    const response = await callAnthropic(input.apiKey, {
      model: input.model,
      max_tokens: 8,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: "Reply with VALID."
        }
      ]
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic validation failed with status ${response.status}.`
      );
    }
  },
  async generatePlan(input: ProviderPlanRequest): Promise<ExecutionPlan> {
    const response = await callAnthropic(input.apiKey, {
      model: input.model,
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify(
            {
              session: input.session,
              request: input.request,
              expectedShape: {
                id: "string",
                sessionId: "string",
                userRequest: "string",
                summary: "string",
                risk: "safe|elevated|destructive",
                requiresConfirmation: true,
                assumptions: ["string"],
                missingInputs: ["string"],
                steps: [
                  {
                    id: "string",
                    kind: "intent|shell",
                    title: "string",
                    rationale: "string",
                    command: "string",
                    cwdPolicy: "session|explicit"
                  }
                ]
              }
            },
            null,
            2
          )
        }
      ]
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic planning failed with status ${response.status}.`
      );
    }

    const payload = (await response.json()) as { content?: unknown };
    const rawText = extractText(payload.content);

    if (!rawText) {
      throw new Error("Anthropic did not return a JSON plan.");
    }

    return JSON.parse(rawText) as ExecutionPlan;
  }
};
