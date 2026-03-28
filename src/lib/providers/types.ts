import type {
  ExecutionPlan,
  ModelOption,
  ProviderId,
  ProviderValidationInput,
  ShellSession
} from "../contracts";

export interface ProviderPlanRequest {
  providerId: ProviderId;
  model: string;
  apiKey: string;
  request: string;
  session: Pick<ShellSession, "id" | "cwd" | "shell" | "os" | "recentOutput">;
}

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  validateKey(input: ProviderValidationInput): Promise<void>;
  generatePlan(input: ProviderPlanRequest): Promise<ExecutionPlan>;
  listSupportedModels(): ModelOption[];
}

