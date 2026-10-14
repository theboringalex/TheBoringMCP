#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, type AppConfig } from "./config.js";
import { startHttpServer } from "./http-server.js";
import { startAdminUi } from "./admin-ui.js";
import { HomeAssistantClient } from "./clients/homeassistant.js";
import { HomeAssistantWsClient } from "./clients/homeassistant-ws.js";
import { PortainerClient } from "./clients/portainer.js";
import { JellyfinClient } from "./clients/jellyfin.js";
import { ArrClient } from "./clients/arr.js";
import { SabnzbdClient } from "./clients/sabnzbd.js";
import { UnifiClient } from "./clients/unifi.js";
import { N8nClient } from "./clients/n8n.js";
import { registerHomeAssistantTools } from "./tools/homeassistant.js";
import { registerPortainerTools } from "./tools/portainer.js";
import { registerPortainerApiTool } from "./tools/portainer-api.js";
import { registerJellyfinTools } from "./tools/jellyfin.js";
import { registerArrTools } from "./tools/arr.js";
import { registerSabnzbdTools } from "./tools/sabnzbd.js";
import { registerUnifiTools } from "./tools/unifi.js";
import { registerN8nTools } from "./tools/n8n.js";

export const VERSION = "2.0.2";

type ServiceKey = "ha" | "portainer" | "jellyfin" | "sonarr" | "radarr" | "sabnzbd" | "unifi" | "n8n";

const ALL: ServiceKey[] = ["ha", "portainer", "jellyfin", "sonarr", "radarr", "sabnzbd", "unifi", "n8n"];

/**
 * URL-Pfad → Dienste. Claude.ai erlaubt pro Connector höchstens ~100 Tools,
 * deshalb gibt es thematische Gruppen, die jeweils darunter bleiben.
 */
const ROUTES: Record<string, ServiceKey[]> = {
  "": ALL,
  all: ALL,
  ha: ["ha"],
  arr: ["sonarr", "radarr"],
  media: ["jellyfin", "sabnzbd"],
  infra: ["portainer", "unifi", "n8n"],
  rest: ["portainer", "jellyfin", "sonarr", "radarr", "sabnzbd", "unifi", "n8n"], // Kompatibilität zu v1
  portainer: ["portainer"],
  jellyfin: ["jellyfin"],
  sonarr: ["sonarr"],
  radarr: ["radarr"],
  sabnzbd: ["sabnzbd"],
  unifi: ["unifi"],
  protect: ["unifi"], // Alias
  n8n: ["n8n"],
};

export function servicesForPath(pathname: string): ServiceKey[] | undefined {
  return ROUTES[pathname.replace(/^\/+|\/+$/g, "").toLowerCase()];
}

/**
 * Baut eine frische McpServer-Instanz mit den (konfigurierten UND angefragten)
 * Diensten. Im HTTP-Modus entsteht pro Request eine neue Instanz (zustandsloser
 * Streamable-HTTP-Transport), im stdio-Modus einmalig.
 */
function buildMcpServer(config: AppConfig, wanted: ServiceKey[], { log = false }: { log?: boolean } = {}) {
  const server = new McpServer({ name: "theboringmcp", version: VERSION });
  const ro = config.readOnly;
  const counter = { count: 0 };
  const active: string[] = [];
  const want = new Set(wanted);

  if (want.has("ha") && config.homeAssistant) {
    registerHomeAssistantTools(server, new HomeAssistantClient(config.homeAssistant), ro, new HomeAssistantWsClient(config.homeAssistant));
    active.push("Home Assistant");
  }
  if (want.has("portainer") && config.portainer) {
    const client = new PortainerClient(config.portainer);
    registerPortainerTools(server, client, ro);
    registerPortainerApiTool(server, client, ro, counter);
    active.push("Portainer");
  }
  if (want.has("jellyfin") && config.jellyfin) {
    registerJellyfinTools(server, new JellyfinClient(config.jellyfin), ro, counter);
    active.push("Jellyfin");
  }
  if (want.has("sonarr") && config.sonarr) {
    registerArrTools(server, new ArrClient(config.sonarr), ro, "sonarr", counter);
    active.push("Sonarr");
  }
  if (want.has("radarr") && config.radarr) {
    registerArrTools(server, new ArrClient(config.radarr), ro, "radarr", counter);
    active.push("Radarr");
  }
  if (want.has("sabnzbd") && config.sabnzbd) {
    registerSabnzbdTools(server, new SabnzbdClient(config.sabnzbd), ro, counter);
    active.push("SABnzbd");
  }
  if (want.has("unifi") && config.unifi) {
    registerUnifiTools(server, new UnifiClient(config.unifi), ro, counter);
    active.push("UniFi");
  }
  if (want.has("n8n") && config.n8n) {
    registerN8nTools(server, new N8nClient(config.n8n), ro, counter);
    active.push("n8n");
  }

  if (log) {
    console.error(`[TheBoringMCP v${VERSION}] Aktive Dienste: ${active.length ? active.join(", ") : "keiner (siehe Anleitung im README)"}`);
    if (ro) console.error("[TheBoringMCP] READ_ONLY=true -> schreibende Tools sind gesperrt.");
  }
  return server;
}

async function main() {
  const config = loadConfig();
  const mode = (process.env.TRANSPORT ?? "stdio").toLowerCase();

  if (mode === "http") {
    buildMcpServer(config, ALL, { log: true });
    const port = Number(process.env.PORT ?? 17820);
    startHttpServer(
      (pathname) => {
        const services = servicesForPath(pathname);
        return services ? buildMcpServer(config, services) : undefined;
      },
      port,
      process.env.MCP_HTTP_TOKEN,
    );
    // Einstellungsseite im Home-Assistant-Add-on (Ingress)
    if (process.env.ADMIN_UI === "true") startAdminUi(Number(process.env.ADMIN_UI_PORT ?? 8099));
    return;
  }

  const only = process.env.MCP_SERVICES?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const wanted = only?.length ? (only.filter((s) => (ALL as string[]).includes(s)) as ServiceKey[]) : ALL;
  const server = buildMcpServer(config, wanted, { log: true });
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("[TheBoringMCP] Fataler Fehler beim Start:", error);
  process.exit(1);
});
