/**
 * Zentrale Konfiguration für TheBoringMCP.
 *
 * Alles kommt aus Umgebungsvariablen (12-factor-Stil) – so lässt sich der
 * Server sowohl als Home Assistant Add-on (Optionen -> ENV via run.sh)
 * als auch als eigenständiger Docker-Container oder lokal per `npx`
 * betreiben, ohne dass irgendwo Secrets im Repo landen.
 *
 * Jeder Dienst ("App") hat zwei unabhängige Bedingungen:
 *   1. Zugriffsschalter (`ENABLE_<APP>`, Standard: an). Steht er auf aus,
 *      bekommt die App KEINEN Zugriff: Es werden weder Tools registriert noch
 *      Clients/Prozesse gestartet, und die hinterlegten Zugangsdaten werden
 *      nicht verwendet.
 *   2. Konfiguration (URL + Zugangsdaten). Fehlt sie, werden die Tools der
 *      App ebenfalls nicht registriert (Status "nicht konfiguriert").
 */

export const APP_IDS = ["homeassistant", "portainer", "unifi", "jellyfin", "plex", "github"] as const;
export type AppId = (typeof APP_IDS)[number];

export const APP_LABELS: Record<AppId, string> = {
  homeassistant: "Home Assistant",
  portainer: "Portainer",
  unifi: "UniFi",
  jellyfin: "Jellyfin",
  plex: "Plex",
  github: "GitHub",
};

/** Tool-Namenspräfixe je App – dient der Zuordnung/Zählung im Status-Tool. */
export const APP_TOOL_PREFIXES: Record<AppId, string[]> = {
  homeassistant: ["ha_"],
  portainer: ["portainer_"],
  unifi: ["unifi_"],
  jellyfin: ["jellyfin_"],
  plex: ["plex_"],
  github: ["github_"],
};

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

/** Welche UniFi-Tools Clients direkt in `tools/list` sehen (alle bleiben per `unifi_execute` aufrufbar). */
export type UnifiToolMode = "lazy" | "eager" | "meta_only";

export interface UnifiConfig {
  host: string;
  port: number;
  site: string;
  username?: string;
  password?: string;
  apiKey?: string;
  verifySsl: boolean;
  toolMode: UnifiToolMode;
  /** Schreibrechte laut Richtlinie (UNIFI_POLICY_NETWORK_*). Standard: alles verboten (nur lesen). */
  allowCreate: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
  /** "confirm" = Vorschau + Bestätigung bei jeder Änderung (Standard), "bypass" = ohne Bestätigung. */
  permissionMode: "confirm" | "bypass";
  /** Wie der eingebundene unifi-network-mcp-Prozess gestartet wird. */
  command: string;
  args: string[];
}

export type AppState = "active" | "disabled" | "not_configured";

export interface AppSwitch {
  /** Zugriffsschalter. false = die App bekommt keinen Zugriff. */
  enabled: boolean;
  /** URL/Zugangsdaten vollständig vorhanden. */
  configured: boolean;
}

export interface AppConfig {
  homeAssistant?: HomeAssistantConfig;
  portainer?: PortainerConfig;
  unifi?: UnifiConfig;
  jellyfin?: JellyfinConfig;
  github?: GithubConfig;
  plex?: PlexConfig;
  /** Schalter- und Konfigurationsstatus je App (auch für deaktivierte Apps vorhanden). */
  apps: Record<AppId, AppSwitch>;
  readOnly: boolean;
}

export function appState(sw: AppSwitch): AppState {
  if (!sw.enabled) return "disabled";
  return sw.configured ? "active" : "not_configured";
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/** true/1/yes/on bzw. false/0/no/off (ohne Beachtung der Groß-/Kleinschreibung); sonst `fallback`. */
export function envBool(name: string, fallback: boolean): boolean {
  const value = env(name)?.toLowerCase();
  if (value === undefined) return fallback;
  if (["true", "1", "yes", "on"].includes(value)) return true;
  if (["false", "0", "no", "off"].includes(value)) return false;
  return fallback;
}

function envInt(name: string, fallback: number): number {
  const value = Number(env(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function parseToolMode(value: string | undefined): UnifiToolMode {
  const v = value?.toLowerCase();
  return v === "eager" || v === "meta_only" ? v : "lazy";
}

export function loadConfig(): AppConfig {
  const enabled: Record<AppId, boolean> = {
    homeassistant: envBool("ENABLE_HOMEASSISTANT", true),
    portainer: envBool("ENABLE_PORTAINER", true),
    unifi: envBool("ENABLE_UNIFI", true),
    jellyfin: envBool("ENABLE_JELLYFIN", true),
    plex: envBool("ENABLE_PLEX", true),
    github: envBool("ENABLE_GITHUB", true),
  };

  const haUrl = env("HA_URL");
  const haToken = env("HA_TOKEN");

  const portainerUrl = env("PORTAINER_URL");
  const portainerApiKey = env("PORTAINER_API_KEY");
  const portainerUsername = env("PORTAINER_USERNAME");
  const portainerPassword = env("PORTAINER_PASSWORD");

  const unifiHost = env("UNIFI_HOST");
  const unifiUsername = env("UNIFI_USERNAME");
  const unifiPassword = env("UNIFI_PASSWORD");
  const unifiApiKey = env("UNIFI_API_KEY");

  const jellyfinUrl = env("JELLYFIN_URL");
  const jellyfinKey = env("JELLYFIN_API_KEY");

  const githubToken = env("GITHUB_TOKEN");
  const githubApiUrl = env("GITHUB_API_URL");

  const plexUrl = env("PLEX_URL");
  const plexToken = env("PLEX_TOKEN");

  const readOnly = envBool("READ_ONLY", false);

  const haConfigured = Boolean(haUrl && haToken);
  const portainerConfigured = Boolean(portainerUrl && (portainerApiKey || (portainerUsername && portainerPassword)));
  const unifiConfigured = Boolean(unifiHost && (unifiApiKey || (unifiUsername && unifiPassword)));
  const jellyfinConfigured = Boolean(jellyfinUrl && jellyfinKey);
  const githubConfigured = Boolean(githubToken);
  const plexConfigured = Boolean(plexUrl && plexToken);

  const config: AppConfig = {
    readOnly,
    apps: {
      homeassistant: { enabled: enabled.homeassistant, configured: haConfigured },
      portainer: { enabled: enabled.portainer, configured: portainerConfigured },
      unifi: { enabled: enabled.unifi, configured: unifiConfigured },
      jellyfin: { enabled: enabled.jellyfin, configured: jellyfinConfigured },
      plex: { enabled: enabled.plex, configured: plexConfigured },
      github: { enabled: enabled.github, configured: githubConfigured },
    },
  };

  // Deaktivierte Apps bekommen bewusst gar keine Konfiguration: So kann
  // nirgends versehentlich ein Client/Prozess mit ihren Zugangsdaten entstehen.
  if (enabled.homeassistant && haUrl && haToken) {
    config.homeAssistant = { baseUrl: trimTrailingSlash(haUrl), token: haToken };
  }

  if (enabled.portainer && portainerConfigured && portainerUrl) {
    config.portainer = {
      baseUrl: trimTrailingSlash(portainerUrl),
      apiKey: portainerApiKey,
      username: portainerUsername,
      password: portainerPassword,
      insecureTls: env("PORTAINER_INSECURE_TLS") !== "false",
    };
  }

  if (enabled.unifi && unifiConfigured && unifiHost) {
    config.unifi = {
      host: unifiHost,
      port: envInt("UNIFI_PORT", 443),
      site: env("UNIFI_SITE") ?? "default",
      username: unifiUsername,
      password: unifiPassword,
      apiKey: unifiApiKey,
      verifySsl: envBool("UNIFI_VERIFY_SSL", false),
      toolMode: parseToolMode(env("UNIFI_TOOL_MODE")),
      // Im READ_ONLY-Modus sind Schreibrechte unabhängig von den Einzeloptionen aus.
      allowCreate: !readOnly && envBool("UNIFI_ALLOW_CREATE", false),
      allowUpdate: !readOnly && envBool("UNIFI_ALLOW_UPDATE", false),
      allowDelete: !readOnly && envBool("UNIFI_ALLOW_DELETE", false),
      permissionMode: env("UNIFI_PERMISSION_MODE") === "bypass" && !readOnly ? "bypass" : "confirm",
      command: env("UNIFI_MCP_COMMAND") ?? "unifi-network-mcp",
      args: (env("UNIFI_MCP_ARGS") ?? "").split(/\s+/).filter(Boolean),
    };
  }

  if (enabled.jellyfin && jellyfinUrl && jellyfinKey) {
    config.jellyfin = { baseUrl: trimTrailingSlash(jellyfinUrl), apiKey: jellyfinKey };
  }

  if (enabled.github && githubToken) {
    config.github = { baseUrl: trimTrailingSlash(githubApiUrl ?? "https://api.github.com"), token: githubToken };
  }

  if (enabled.plex && plexUrl && plexToken) {
    config.plex = { baseUrl: trimTrailingSlash(plexUrl), token: plexToken };
  }

  return config;
}
