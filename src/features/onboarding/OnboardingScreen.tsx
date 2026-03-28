import { type FormEvent, useMemo, useState } from "react";
import type { AppSettings, ProviderConfig, ProviderId } from "../../lib/contracts";
import { MODEL_CATALOG } from "../../lib/providers/catalog";
import { getProviderAdapter } from "../../lib/providers";
import { saveProviderKey, saveSettings } from "../../lib/tauri/bridge";

interface OnboardingScreenProps {
  onConfigured: (settings: AppSettings) => void;
}

export function OnboardingScreen({
  onConfigured
}: OnboardingScreenProps): JSX.Element {
  const [providerId, setProviderId] = useState<ProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(MODEL_CATALOG.openai[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const models = useMemo(() => MODEL_CATALOG[providerId], [providerId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const provider = getProviderAdapter(providerId);
      await provider.validateKey({ apiKey, model });

      const providerConfig: ProviderConfig = {
        providerId,
        defaultModel: model,
        enabled: true,
        keychainAccount: `${providerId}-default`
      };

      const settings: AppSettings = {
        activeProviderId: providerId,
        providers: [providerConfig],
        safetyMode: "preview_confirm",
        defaultShellMac: "login_shell",
        defaultShellWindows: "pwsh"
      };

      await saveProviderKey(
        providerId,
        providerConfig.keychainAccount,
        apiKey.trim()
      );
      await saveSettings(settings);
      onConfigured(settings);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to validate and store the provider configuration."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen onboarding-screen">
      <section className="panel hero-panel">
        <p className="eyebrow">PromptCLI</p>
        <h1>Natural language for a real terminal.</h1>
        <p className="muted">
          Connect a provider once, then open a terminal window that can turn
          requests like “push it to github” into reviewable shell plans.
        </p>
      </section>

      <section className="panel onboarding-panel">
        <h2>Set up your first provider</h2>
        <form className="stack-md" onSubmit={handleSubmit}>
          <label className="field">
            <span>Provider</span>
            <select
              value={providerId}
              onChange={(event) => {
                const nextProvider = event.target.value as ProviderId;
                setProviderId(nextProvider);
                setModel(MODEL_CATALOG[nextProvider][0].id);
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>

          <label className="field">
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Paste your provider API key"
              autoComplete="off"
              required
            />
          </label>

          <label className="field">
            <span>Default model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              {models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="error-banner">{error}</p> : null}

          <button className="primary-button" disabled={busy || !apiKey.trim()}>
            {busy ? "Validating..." : "Validate and launch"}
          </button>
        </form>
      </section>
    </main>
  );
}
