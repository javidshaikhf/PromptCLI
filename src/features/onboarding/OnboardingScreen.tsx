import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { AppSettings, ProviderConfig, ProviderId } from "../../lib/contracts";
import { MODEL_CATALOG } from "../../lib/providers/catalog";
import { getProviderAdapter } from "../../lib/providers";
import { upsertProviderConfig } from "../../lib/settings/defaults";
import { saveProviderKey, saveSettings } from "../../lib/tauri/bridge";

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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && reason === "settings" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busy, onClose, reason]);

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
    <div className="terminal-setup-overlay">
      <section className="terminal-setup-screen">
        <div className="terminal-setup-copy">
          <p>[promptcli] setup</p>
          <p>
            {reason === "first_nl_request"
              ? "[promptcli] connect a model before using natural language"
              : "[promptcli] configure or update a model provider"}
          </p>
          <p>[promptcli] shell commands still work without a provider</p>
          <p>[promptcli] choose a provider, paste the key, then press Enter to save</p>
          {reason === "settings" ? (
            <p>[promptcli] press Esc to cancel</p>
          ) : null}
        </div>

        <form className="terminal-setup-form" onSubmit={handleSubmit}>
          <label className="terminal-setup-row">
            <span className="terminal-setup-label">provider</span>
            <span className="terminal-setup-separator">&gt;</span>
            <select
              disabled={busy}
              value={providerId}
              onChange={(event) => {
                const nextProvider = event.target.value as ProviderId;
                setProviderId(nextProvider);
                setModel(MODEL_CATALOG[nextProvider][0].id);
              }}
            >
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
            </select>
          </label>

          <label className="terminal-setup-row">
            <span className="terminal-setup-label">api_key</span>
            <span className="terminal-setup-separator">&gt;</span>
            <input
              autoComplete="off"
              disabled={busy}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="paste api key"
              required
              type="password"
              value={apiKey}
            />
          </label>

          <label className="terminal-setup-row">
            <span className="terminal-setup-label">model</span>
            <span className="terminal-setup-separator">&gt;</span>
            <select
              disabled={busy}
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

          <div className="terminal-setup-copy">
            <p>
              [promptcli] {busy ? "validating and saving..." : "press Enter to continue"}
            </p>
            {error ? <p className="terminal-setup-error">[promptcli] error: {error}</p> : null}
          </div>

          <button className="terminal-setup-submit" disabled={busy || !apiKey.trim()}>
            Save provider
          </button>
        </form>
      </section>
    </div>
  );
}
