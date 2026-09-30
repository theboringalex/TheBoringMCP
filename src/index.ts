#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { startHttpServer } from "./http-server.js";
import { HomeAssistantClient } from "./clients/homeassistant.js";
import { HomeAssistantWsClient } from "./clients/homeassistant-ws.js";
import { PortainerClient } from "./clients/portainer.js";
import { SonarrClient } from "./clients/sonarr.js";
import { RadarrClient } from "./clients/radarr.js";
import { SabnzbdClient } from "./clients/sabnzbd.js";
import { JellyfinClient } from "./clients/jellyfin.js";
import { GithubClient } from "./clients/github.js";
import { PlexClient } from "./clients/plex.js";
import { registerHomeAssistantTools } from "./tools/homeassistant.js";
import { registerPortainerTools } from "./tools/portainer.js";
import { registerSonarrTools, registerRadarrTools, registerSabnzbdTools, registerJellyfinTools } from "./tools/media.js";
import { registerGithubTools } from "./tools/github.js";
import { registerPlexTools } from "./tools/plex.js";

const VERSION = "0.4.1";

type Config = ReturnType<typeof loadConfig>;

/**
 * Baut eine frische McpServer-Instanz mit allen (je nach Konfiguration
 * aktiven) Tools auf. Wird sowohl für den stdio-Modus (einmalig) als auch
 * für den HTTP-Modus (pro Request, siehe http-server.ts) verwendet – im
 * HTTP-Streamable-Transport muss laut MCP-SDK im zustandslosen Betrieb pro
 * Request eine neue Transport-/Server-Instanz entstehen, sonst schlägt der
 * zweite `initialize`-Aufruf mit "Server already initialized" fehl.
 */
function buildMcpServer(config: Config, { log = false }: { log?: boolean } = {}) {
  const server = new McpServer({
    name: "theboringmcp",
    version: VERSION,
  });

  const registered: string[] = [];

  if (config.homeAssistant) {
    registerHomeAssistantTools(
      server,
      new HomeAssistantClient(config.homeAssistant),
      config.readOnly,
      new HomeAssistantWsClient(config.homeAssistant),
    );
    registered.push("Home Assistant");
  }

  if (config.portainer) {
    registerPortainerTools(server, new PortainerClient(config.portainer), config.readOnly);
    registered.push("Portainer");
  }

  if (config.sonarr) {
    registerSonarrTools(server, new SonarrClient(config.sonarr), config.readOnly);
    registered.push("Sonarr");
  }

  if (config.radarr) {
    registerRadarrTools(server, new RadarrClient(config.radarr), config.readOnly);
    registered.push("Radarr");
  }

  if (config.sabnzbd) {
    registerSabnzbdTools(server, new SabnzbdClient(config.sabnzbd), config.readOnly);
    registered.push("SABnzbd");
  }

  if (config.jellyfin) {
    registerJellyfinTools(server, new JellyfinClient(config.jellyfin), config.readOnly);
    registered.push("Jellyfin");
  }

  if (config.github) {
    registerGithubTools(server, new GithubClient(config.github), config.readOnly);
    registered.push("GitHub");
  }

  if (config.plex) {
    registerPlexTools(server, new PlexClient(config.plex), config.readOnly);
    registered.push("Plex");
  }

  if (log) {
    // Alles geht nach stderr, damit stdout ausschließlich für das MCP-Protokoll frei bleibt.
    console.error(`[TheBoringMCP v${VERSION}] Aktive Dienste: ${registered.length ? registered.join(", ") : "keiner (siehe README für ENV-Variablen)"}`);
    if (config.readOnly) {
      console.error("[TheBoringMCP] READ_ONLY=true -> schreibende Tools sind deaktiviert.");
    }
  }

  return server;
}

async function main() {
  const config = loadConfig();

  const transportMode = (process.env.TRANSPORT ?? "stdio").toLowerCase();

  if (transportMode === "http") {
    buildMcpServer(config, { log: true }); // nur für die Start-Logausgabe (aktive Dienste)
    const port = Number(process.env.PORT ?? 17820);
    startHttpServer(() => buildMcpServer(config), port, process.env.MCP_HTTP_TOKEN);
    return;
  }

  const server = buildMcpServer(config, { log: true });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[TheBoringMCP] Fataler Fehler beim Start:", error);
  process.exit(1);
});
