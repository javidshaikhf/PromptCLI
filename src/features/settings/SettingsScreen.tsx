import { useState } from "react";
import type { AppSettings, ProviderId } from "../../lib/contracts";
import { MODEL_CATALOG } from "../../lib/providers/catalog";
import { removeProviderKey, saveProviderKey, saveSettings } from "../../lib/tauri/bridge";
import { removeProviderConfig } from "../../lib/settings/defaults";

interface SettingsScreenProps {
  settings: AppSettings;
  onClose: () => void;
  onChange: (settings: AppSettings) => void;
  onAddProvider: () => void;
}

export function SettingsScreen({
  settings,
  onClose,
  onChange,
  onAddProvider
}: SettingsScreenProps): JSX.Element {
  const [draft, setDraft] = useState(settings);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const activeProvider = draft.providers.find(
    (provider) => provider.providerId === draft.activeProviderId
  );

  async function handleSave() {
    setStatus("Saving settings...");
    setError(null);

    try {
      const nextDraft: AppSettings = {
        ...draft,
        providers: draft.providers.map((provider) => {
          const maybeKey = apiKeys[provider.providerId];
          return maybeKey?.trim()
            ? { ...provider, apiKeyFallback: maybeKey.trim() }
            : provider;
        })
      };

      for (const provider of draft.providers) {
        const maybeKey = apiKeys[provider.providerId];
        if (maybeKey?.trim()) {
          await saveProviderKey(
            provider.providerId,
            provider.keychainAccount,
            maybeKey.trim()
          );
        }
      }
      await saveSettings(nextDraft);
      onChange(nextDraft);
      setStatus("Settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save settings."
      );
      setStatus(null);
    }
  }

  async function handleRemoveProvider(providerId: ProviderId) {
    try {
      await removeProviderKey(providerId);
      const nextSettings = removeProviderConfig(draft, providerId);

      setDraft(nextSettings);
      setStatus(`Removed ${providerId} credentials.`);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove provider."
      );
    }
  }

  return (
    <div className="settings-overlay">
      <section className="panel settings-panel">
        <div className="space-between">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Providers and terminal behavior</h2>
          </div>
          <div className="button-row">
            <button className="ghost-button" onClick={onAddProvider} type="button">
              Add provider
            </button>
            <button className="ghost-button" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        {draft.providers.length > 0 ? (
          <label className="field">
            <span>Active provider</span>
            <select
              value={draft.activeProviderId ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  activeProviderId: event.target.value as ProviderId
                }))
              }
            >
              {draft.providers.map((provider) => (
                <option key={provider.providerId} value={provider.providerId}>
                  {provider.providerId}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="muted">
            No provider configured yet. Shell commands still work. Add a provider
            to enable natural-language planning.
          </p>
        )}

        {draft.providers.map((provider) => (
          <section className="provider-card" key={provider.providerId}>
            <div className="space-between">
              <strong>{provider.providerId}</strong>
              <button
                className="ghost-button danger-text"
                onClick={() => handleRemoveProvider(provider.providerId)}
                type="button"
              >
                Remove
              </button>
            </div>

            <label className="field">
              <span>Default model</span>
              <select
                value={provider.defaultModel}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    providers: current.providers.map((item) =>
                      item.providerId === provider.providerId
                        ? { ...item, defaultModel: event.target.value }
                        : item
                    )
                  }))
                }
              >
                {MODEL_CATALOG[provider.providerId].map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Replace API key</span>
              <input
                type="password"
                value={apiKeys[provider.providerId] ?? ""}
                onChange={(event) =>
                  setApiKeys((current) => ({
                    ...current,
                    [provider.providerId]: event.target.value
                  }))
                }
                placeholder={`Update the ${provider.providerId} key`}
              />
            </label>
          </section>
        ))}

        <div className="status-row">
          <span className="muted">
            Safety mode: <strong>{draft.safetyMode}</strong>
          </span>
          <span className="muted">
            Default macOS shell: <strong>{draft.defaultShellMac}</strong>
          </span>
          <span className="muted">
            Default Windows shell: <strong>{draft.defaultShellWindows}</strong>
          </span>
        </div>

        {activeProvider ? (
          <p className="muted">
            Plans will use <strong>{activeProvider.providerId}</strong> with{" "}
            <strong>{activeProvider.defaultModel}</strong>.
          </p>
        ) : (
          <p className="muted">
            PromptCLI will ask for provider setup the first time someone enters
            a natural-language request.
          </p>
        )}

        {error ? <p className="error-banner">{error}</p> : null}
        {status ? <p className="success-banner">{status}</p> : null}

        <button className="primary-button" onClick={handleSave} type="button">
          Save settings
        </button>
      </section>
    </div>
  );
}
