/**
 * Zentrale Konfiguration für TheBoringMCP v2.
 *
 * Alles kommt aus Umgebungsvariablen (12-factor-Stil) – so lässt sich der
 * Server sowohl als Home Assistant Add-on (Optionen -> ENV via run.sh) als
 * auch als eigenständiger Docker-Container oder lokal betreiben, ohne dass
 * irgendwo Secrets im Repo landen.
 *
 * Jeder Dienst ist einzeln optional und lässt sich mit <DIENST>_ENABLED=false
 * ausschalten (z. B. SONARR_ENABLED=false). Ist keine URL / kein Schlüssel
 * gesetzt, wird der Dienst automatisch übersprungen.
 */

export interface HomeAssistantConfig {
  baseUrl: string;
  token: string;
}

export interface PortainerConfig {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  /** Selbstsignierte Zertifikate akzeptieren (Standard: true, typisch im Heimnetz). */
  insecureTls: boolean;
}

/** Gemeinsame Form für Dienste mit URL + API-Schlüssel. */
export interface ApiKeyConfig {
  baseUrl: string;
  apiKey: string;
}

export interface JellyfinConfig extends ApiKeyConfig {}
export interface SonarrConfig extends ApiKeyConfig {}
export interface RadarrConfig extends ApiKeyConfig {}
export interface SabnzbdConfig extends ApiKeyConfig {}
export interface N8nConfig extends ApiKeyConfig {}

export interface UnifiConfig extends ApiKeyConfig {
  /** UniFi-Geräte nutzen fast immer ein selbstsigniertes Zertifikat (Standard: true). */
  insecureTls: boolean;
}

export interface AppConfig {
  homeAssistant?: HomeAssistantConfig;
  portainer?: PortainerConfig;
  jellyfin?: JellyfinConfig;
  sonarr?: SonarrConfig;
  radarr?: RadarrConfig;
  sabnzbd?: SabnzbdConfig;
  unifi?: UnifiConfig;
  n8n?: N8nConfig;
  readOnly: boolean;
}

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/** Dienst ist an, solange <PREFIX>_ENABLED nicht ausdrücklich "false" ist. */
function enabled(prefix: string): boolean {
  return env(`${prefix}_ENABLED`)?.toLowerCase() !== "false";
}

function apiKeyService(prefix: string): ApiKeyConfig | undefined {
  if (!enabled(prefix)) return undefined;
  const url = env(`${prefix}_URL`);
  const key = env(`${prefix}_API_KEY`);
  return url && key ? { baseUrl: trimTrailingSlash(url), apiKey: key } : undefined;
}

export function loadConfig(): AppConfig {
  const config: AppConfig = { readOnly: env("READ_ONLY")?.toLowerCase() === "true" };

  const haUrl = env("HA_URL");
  const haToken = env("HA_TOKEN");
  if (enabled("HA") && haUrl && haToken) {
    config.homeAssistant = { baseUrl: trimTrailingSlash(haUrl), token: haToken };
  }

  const portainerUrl = env("PORTAINER_URL");
  const portainerApiKey = env("PORTAINER_API_KEY");
  const portainerUsername = env("PORTAINER_USERNAME");
  const portainerPassword = env("PORTAINER_PASSWORD");
  if (enabled("PORTAINER") && portainerUrl && (portainerApiKey || (portainerUsername && portainerPassword))) {
    config.portainer = {
      baseUrl: trimTrailingSlash(portainerUrl),
      apiKey: portainerApiKey,
      username: portainerUsername,
      password: portainerPassword,
      insecureTls: env("PORTAINER_INSECURE_TLS") !== "false",
    };
  }

  config.jellyfin = apiKeyService("JELLYFIN");
  config.sonarr = apiKeyService("SONARR");
  config.radarr = apiKeyService("RADARR");
  config.sabnzbd = apiKeyService("SABNZBD");
  config.n8n = apiKeyService("N8N");

  const unifi = apiKeyService("UNIFI");
  if (unifi) {
    config.unifi = { ...unifi, insecureTls: env("UNIFI_INSECURE_TLS") !== "false" };
  }

  return config;
}
