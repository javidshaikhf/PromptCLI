import { type FormEvent, useMemo, useState } from "react";
import type { AppSettings, ProviderConfig, ProviderId } from "../../lib/contracts";
import { MODEL_CATALOG } from "../../lib/providers/catalog";
import { getProviderAdapter } from "../../lib/providers";
import { saveProviderKey, saveSettings } from "../../lib/tauri/bridge";
import { upsertProviderConfig } from "../../lib/settings/defaults";

interface OnboardingScreenProps {
  currentSettings: AppSettings;
  onClose: () => void;
  onConfigured: (settings: AppSettings) => void;
  reason: "first_nl_request" | "settings";
}

export function OnboardingScreen({
  currentSettings,
  onClose,
  reason,
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

      const settings = upsertProviderConfig(currentSettings, providerConfig);

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
    <div className="settings-overlay">
      <section className="panel provider-setup-panel">
        <div className="space-between">
          <div>
            <p className="eyebrow">Provider setup</p>
            <h2>
              {reason === "first_nl_request"
                ? "Connect a model before using English requests"
                : "Add or update a provider"}
            </h2>
            <p className="muted">
              Shell commands keep working without a provider. Natural-language
              planning needs one configured provider.
            </p>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

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
            {busy ? "Validating..." : "Save provider"}
          </button>
        </form>
      </section>
    </div>
  );
}
