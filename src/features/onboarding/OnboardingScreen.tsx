import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { AppSettings, ProviderConfig, ProviderId } from "../../lib/contracts";
import { MODEL_CATALOG } from "../../lib/providers/catalog";
import { getProviderAdapter } from "../../lib/providers";
import { upsertProviderConfig } from "../../lib/settings/defaults";
import { saveProviderKey, saveSettings } from "../../lib/tauri/bridge";

const STEP_TIMEOUT_MS = 15000;

interface OnboardingScreenProps {
  currentSettings: AppSettings;
  onClose: () => void;
  onConfigured: (
    settings: AppSettings,
    providerId: ProviderId,
    apiKey: string
  ) => void;
  reason: "first_nl_request" | "settings";
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, STEP_TIMEOUT_MS);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
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
  const [status, setStatus] = useState("press Enter to continue");

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
    setStatus("validating provider...");

    try {
      const provider = getProviderAdapter(providerId);
      await withTimeout(
        provider.validateKey({ apiKey: apiKey.trim(), model }),
        `${providerId} validation`
      );

      const providerConfig: ProviderConfig = {
        providerId,
        defaultModel: model,
        enabled: true,
        keychainAccount: `${providerId}-default`
      };

      const settings = upsertProviderConfig(currentSettings, providerConfig);

      setStatus("saving api key...");
      await withTimeout(
        saveProviderKey(
          providerId,
          providerConfig.keychainAccount,
          apiKey.trim()
        ),
        "Saving API key"
      );

      setStatus("saving local settings...");
      await withTimeout(saveSettings(settings), "Saving settings");

      setStatus("setup complete");
      onConfigured(settings, providerId, apiKey.trim());
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to validate and store the provider configuration."
      );
      setStatus("press Enter to continue");
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
            <p>[promptcli] {status}</p>
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
