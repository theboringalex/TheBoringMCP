/**
 * Zentrale Konfiguration für TheBoringMCP.
 *
 * Alles kommt aus Umgebungsvariablen (12-factor-Stil) – so lässt sich der
 * Server sowohl als Home Assistant Add-on (Optionen -> ENV via run.sh)
 * als auch als eigenständiger Docker-Container oder lokal per `npx`
 * betreiben, ohne dass irgendwo Secrets im Repo landen.
 *
 * Jeder Dienst ist einzeln optional: Ist z.B. keine PORTAINER_URL gesetzt,
 * werden die Portainer-Tools beim Start einfach nicht registriert.
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
  /**
   * Portainer läuft im Heimnetz häufig mit einem selbstsignierten
   * TLS-Zertifikat (z.B. https://<nas-ip>:9444). Node's `fetch` lehnt das
   * standardmäßig ab ("fetch failed"). Default: true, da genau dieser Fall
   * die Norm ist; per PORTAINER_INSECURE_TLS=false abschaltbar, sobald ein
   * gültiges/vertrauenswürdiges Zertifikat vorliegt.
   */
  insecureTls: boolean;
}

export interface SonarrConfig {
  baseUrl: string;
  apiKey: string;
}

export interface RadarrConfig {
  baseUrl: string;
  apiKey: string;
}

export interface SabnzbdConfig {
  baseUrl: string;
  apiKey: string;
}

export interface JellyfinConfig {
  baseUrl: string;
  apiKey: string;
}

export interface GithubConfig {
  /** API-Basis-URL, für GitHub Enterprise Server anpassbar (Standard: https://api.github.com). */
  baseUrl: string;
  token: string;
}

export interface PlexConfig {
  baseUrl: string;
  /** X-Plex-Token (Einstellungen -> Netzwerk -> "Token anzeigen", oder https://plex.tv/claim). */
  token: string;
}

export interface AppConfig {
  homeAssistant?: HomeAssistantConfig;
  portainer?: PortainerConfig;
  sonarr?: SonarrConfig;
  radarr?: RadarrConfig;
  sabnzbd?: SabnzbdConfig;
  jellyfin?: JellyfinConfig;
  github?: GithubConfig;
  plex?: PlexConfig;
  readOnly: boolean;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function loadConfig(): AppConfig {
  const haUrl = env("HA_URL");
  const haToken = env("HA_TOKEN");

  const portainerUrl = env("PORTAINER_URL");
  const portainerApiKey = env("PORTAINER_API_KEY");
  const portainerUsername = env("PORTAINER_USERNAME");
  const portainerPassword = env("PORTAINER_PASSWORD");

  const sonarrUrl = env("SONARR_URL");
  const sonarrKey = env("SONARR_API_KEY");

  const radarrUrl = env("RADARR_URL");
  const radarrKey = env("RADARR_API_KEY");

  const sabnzbdUrl = env("SABNZBD_URL");
  const sabnzbdKey = env("SABNZBD_API_KEY");

  const jellyfinUrl = env("JELLYFIN_URL");
  const jellyfinKey = env("JELLYFIN_API_KEY");

  const githubToken = env("GITHUB_TOKEN");
  const githubApiUrl = env("GITHUB_API_URL");

  const plexUrl = env("PLEX_URL");
  const plexToken = env("PLEX_TOKEN");

  const config: AppConfig = {
    readOnly: env("READ_ONLY") === "true",
  };

  if (haUrl && haToken) {
    config.homeAssistant = { baseUrl: trimTrailingSlash(haUrl), token: haToken };
  }

  if (portainerUrl && (portainerApiKey || (portainerUsername && portainerPassword))) {
    config.portainer = {
      baseUrl: trimTrailingSlash(portainerUrl),
      apiKey: portainerApiKey,
      username: portainerUsername,
      password: portainerPassword,
      insecureTls: env("PORTAINER_INSECURE_TLS") !== "false",
    };
  }

  if (sonarrUrl && sonarrKey) {
    config.sonarr = { baseUrl: trimTrailingSlash(sonarrUrl), apiKey: sonarrKey };
  }

  if (radarrUrl && radarrKey) {
    config.radarr = { baseUrl: trimTrailingSlash(radarrUrl), apiKey: radarrKey };
  }

  if (sabnzbdUrl && sabnzbdKey) {
    config.sabnzbd = { baseUrl: trimTrailingSlash(sabnzbdUrl), apiKey: sabnzbdKey };
  }

  if (jellyfinUrl && jellyfinKey) {
    config.jellyfin = { baseUrl: trimTrailingSlash(jellyfinUrl), apiKey: jellyfinKey };
  }

  if (githubToken) {
    config.github = { baseUrl: trimTrailingSlash(githubApiUrl ?? "https://api.github.com"), token: githubToken };
  }

  if (plexUrl && plexToken) {
    config.plex = { baseUrl: trimTrailingSlash(plexUrl), token: plexToken };
  }

  return config;
}
