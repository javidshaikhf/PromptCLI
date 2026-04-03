import type {
  ExecutionPlan,
  ModelOption,
  ProviderValidationInput
} from "../contracts";
import { MODEL_CATALOG } from "./catalog";
import type { ProviderAdapter, ProviderPlanRequest } from "./types";

const SYSTEM_PROMPT = [
  "You are PromptCLI's planning model.",
  "Return strict JSON only.",
  "Build an execution plan for a shell session.",
  "Do not execute commands, only propose them.",
  "Include assumptions and missingInputs when context is incomplete."
].join(" ");

const REQUEST_TIMEOUT_MS = 15000;

function extractText(output: unknown): string {
  if (!Array.isArray(output)) {
    return "";
  }

  const textParts: string[] = [];
  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    if (!("content" in item) || !Array.isArray(item.content)) {
      continue;
    }
    for (const content of item.content) {
      if (
        typeof content === "object" &&
        content !== null &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

async function callOpenAI(
  apiKey: string,
  body: Record<string, unknown>
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("OpenAI request timed out. Check your network and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const openAIAdapter: ProviderAdapter = {
  id: "openai",
  label: "OpenAI",
  listSupportedModels(): ModelOption[] {
    return MODEL_CATALOG.openai;
  },
  async validateKey(input: ProviderValidationInput): Promise<void> {
    const response = await callOpenAI(input.apiKey, {
      model: input.model,
      input: "Reply with the word VALID.",
      max_output_tokens: 16
    });

    if (!response.ok) {
      throw new Error(`OpenAI validation failed with status ${response.status}.`);
    }
  },
  async generatePlan(input: ProviderPlanRequest): Promise<ExecutionPlan> {
    const response = await callOpenAI(input.apiKey, {
      model: input.model,
      text: {
        format: {
          type: "json_object"
        }
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
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
        }
      ]
    });

    if (!response.ok) {
      throw new Error(`OpenAI planning failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { output?: unknown };
    const rawText = extractText(payload.output);

    if (!rawText) {
      throw new Error("OpenAI did not return a JSON plan.");
    }

    return JSON.parse(rawText) as ExecutionPlan;
  }
};
