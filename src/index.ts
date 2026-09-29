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

const VERSION = "1.0.0";

type Config = ReturnType<typeof loadConfig>;

/**
 * Claude-Connectoren zeigen pro MCP-Server nur die ersten ~100 Tools an.
 * Seit der Home-Assistant-Erweiterung (WebSocket-Client, ~80 HA-Tools)
 * würde ein einziger Server mit allen Diensten (HA + Portainer + ARR-Stack +
 * Jellyfin + Plex + GitHub) weit über 100 Tools kommen – alles nach dem
 * Limit wird vom Connector stillschweigend abgeschnitten.
 *
 * Lösung: zwei Tool-Gruppen über zwei HTTP-Pfade (siehe http-server.ts):
 * "/" registriert nur Home Assistant (~80 Tools), "/rest" registriert alle
 * anderen Dienste (~90 Tools). Beide passen einzeln unter das Limit. Im
 * lokalen stdio-Modus (Claude Desktop/Code) gibt es dieses Limit nicht auf
 * dieselbe Weise, dort bleibt alles in einem Server ("all").
 */
type ToolGroup = "all" | "ha" | "rest";

/**
 * Baut eine frische McpServer-Instanz mit den (je nach Konfiguration und
 * Tool-Gruppe aktiven) Tools auf. Wird sowohl für den stdio-Modus (einmalig,
 * Gruppe "all") als auch für den HTTP-Modus (pro Request, siehe
 * http-server.ts) verwendet – im HTTP-Streamable-Transport muss laut
 * MCP-SDK im zustandslosen Betrieb pro Request eine neue Transport-/
 * Server-Instanz entstehen, sonst schlägt der zweite `initialize`-Aufruf
 * mit "Server already initialized" fehl.
 */
function buildMcpServer(config: Config, { log = false, group = "all" }: { log?: boolean; group?: ToolGroup } = {}) {
  const server = new McpServer({
    name: group === "ha" ? "theboringmcp-ha" : group === "rest" ? "theboringmcp-rest" : "theboringmcp",
    version: VERSION,
  });

  const registered: string[] = [];
  const wantHa = group === "all" || group === "ha";
  const wantRest = group === "all" || group === "rest";

  if (wantHa && config.homeAssistant) {
    registerHomeAssistantTools(
      server,
      new HomeAssistantClient(config.homeAssistant),
      config.readOnly,
      new HomeAssistantWsClient(config.homeAssistant),
    );
    registered.push("Home Assistant");
  }

  if (wantRest && config.portainer) {
    registerPortainerTools(server, new PortainerClient(config.portainer), config.readOnly);
    registered.push("Portainer");
  }

  if (wantRest && config.sonarr) {
    registerSonarrTools(server, new SonarrClient(config.sonarr), config.readOnly);
    registered.push("Sonarr");
  }

  if (wantRest && config.radarr) {
    registerRadarrTools(server, new RadarrClient(config.radarr), config.readOnly);
    registered.push("Radarr");
  }

  if (wantRest && config.sabnzbd) {
    registerSabnzbdTools(server, new SabnzbdClient(config.sabnzbd), config.readOnly);
    registered.push("SABnzbd");
  }

  if (wantRest && config.jellyfin) {
    registerJellyfinTools(server, new JellyfinClient(config.jellyfin), config.readOnly);
    registered.push("Jellyfin");
  }

  if (wantRest && config.github) {
    registerGithubTools(server, new GithubClient(config.github), config.readOnly);
    registered.push("GitHub");
  }

  if (wantRest && config.plex) {
    registerPlexTools(server, new PlexClient(config.plex), config.readOnly);
    registered.push("Plex");
  }

  if (log) {
    // Alles geht nach stderr, damit stdout ausschließlich für das MCP-Protokoll frei bleibt.
    const label = group === "ha" ? " (Gruppe: /  -> Home Assistant)" : group === "rest" ? " (Gruppe: /rest -> alle anderen Dienste)" : "";
    console.error(`[TheBoringMCP v${VERSION}]${label} Aktive Dienste: ${registered.length ? registered.join(", ") : "keiner (siehe README für ENV-Variablen)"}`);
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
    buildMcpServer(config, { log: true, group: "ha" }); // Start-Logausgabe pro Gruppe
    buildMcpServer(config, { log: true, group: "rest" });
    const port = Number(process.env.PORT ?? 17820);
    startHttpServer((pathname) => buildMcpServer(config, { group: pathname.startsWith("/rest") ? "rest" : "ha" }), port, process.env.MCP_HTTP_TOKEN);
    return;
  }

  const server = buildMcpServer(config, { log: true, group: "all" });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[TheBoringMCP] Fataler Fehler beim Start:", error);
  process.exit(1);
});
