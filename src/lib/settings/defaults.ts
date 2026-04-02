import type { AppSettings, ProviderConfig, ProviderId } from "../contracts";

export function createDefaultSettings(): AppSettings {
  return {
    activeProviderId: null,
    providers: [],
    safetyMode: "preview_confirm",
    defaultShellMac: "login_shell",
    defaultShellWindows: "pwsh"
  };
}

export function upsertProviderConfig(
  settings: AppSettings,
  provider: ProviderConfig
): AppSettings {
  const existingIndex = settings.providers.findIndex(
    (item) => item.providerId === provider.providerId
  );

  if (existingIndex === -1) {
    return {
      ...settings,
      activeProviderId: provider.providerId,
      providers: [...settings.providers, provider]
    };
  }

  return {
    ...settings,
    activeProviderId: provider.providerId,
    providers: settings.providers.map((item) =>
      item.providerId === provider.providerId ? provider : item
    )
  };
}

export function removeProviderConfig(
  settings: AppSettings,
  providerId: ProviderId
): AppSettings {
  const providers = settings.providers.filter(
    (provider) => provider.providerId !== providerId
  );

  return {
    ...settings,
    activeProviderId:
      settings.activeProviderId === providerId ? providers[0]?.providerId ?? null : settings.activeProviderId,
    providers
  };
}

