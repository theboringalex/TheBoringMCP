#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_IDS, APP_LABELS, APP_TOOL_PREFIXES, appState, loadConfig, type AppId } from "./config.js";
import { ToolGateway, type NativeToolHost } from "./gateway.js";
import { UnifiSource } from "./bridge/unifi.js";
import { startHttpServer } from "./http-server.js";
import { HomeAssistantClient } from "./clients/homeassistant.js";
import { HomeAssistantWsClient } from "./clients/homeassistant-ws.js";
import { PortainerClient } from "./clients/portainer.js";
import { JellyfinClient } from "./clients/jellyfin.js";
import { GithubClient } from "./clients/github.js";
import { PlexClient } from "./clients/plex.js";
import { registerHomeAssistantTools } from "./tools/homeassistant.js";
import { registerHomeAssistantExtraTools } from "./tools/homeassistant-extra.js";
import { registerPortainerTools } from "./tools/portainer.js";
import { registerJellyfinTools } from "./tools/media.js";
import { registerGithubTools } from "./tools/github.js";
import { registerPlexTools } from "./tools/plex.js";

const VERSION = "2.0.0";

type Config = ReturnType<typeof loadConfig>;

/** Gemeinsamer UniFi-Unterprozess (langlebig, von allen Requests geteilt). */
let unifiSource: UnifiSource | undefined;

/** Baut die nativen Tools (HA, Portainer, Jellyfin, GitHub, Plex) – nur für aktive Apps. */
function buildNativeHost(config: Config): { host?: NativeToolHost; active: AppId[] } {
  const active: AppId[] = [];
  const server = new McpServer({ name: "theboringmcp-native", version: VERSION });

  if (config.homeAssistant) {
    registerHomeAssistantTools(
      server,
      new HomeAssistantClient(config.homeAssistant),
      config.readOnly,
      new HomeAssistantWsClient(config.homeAssistant),
    );
    registerHomeAssistantExtraTools(server, config.homeAssistant, config.readOnly);
    active.push("homeassistant");
  }
  if (config.portainer) {
    registerPortainerTools(server, new PortainerClient(config.portainer), config.readOnly);
    active.push("portainer");
  }
  if (config.jellyfin) {
    registerJellyfinTools(server, new JellyfinClient(config.jellyfin), config.readOnly);
    active.push("jellyfin");
  }
  if (config.github) {
    registerGithubTools(server, new GithubClient(config.github), config.readOnly);
    active.push("github");
  }
  if (config.plex) {
    registerPlexTools(server, new PlexClient(config.plex), config.readOnly);
    active.push("plex");
  }
  return { host: active.length ? { server } : undefined, active };
}

function statusDocument(config: Config, toolNames: string[]) {
  const apps = APP_IDS.map((id) => {
    const state = appState(config.apps[id]);
    const prefixes = APP_TOOL_PREFIXES[id];
    const tools = toolNames.filter((n) => prefixes.some((p) => n.startsWith(p))).length;
    const entry: Record<string, unknown> = {
      app: id,
      name: APP_LABELS[id],
      status: state, // active | disabled | not_configured
      switch: config.apps[id].enabled ? "an" : "aus (kein Zugriff)",
      tools: state === "active" ? tools : 0,
    };
    if (id === "unifi" && state === "active" && unifiSource) {
      entry.bridge = unifiSource.state;
      entry.toolsTotal = unifiSource.listAll().length;
      entry.toolMode = config.unifi?.toolMode;
      entry.writePolicy = {
        create: config.unifi?.allowCreate,
        update: config.unifi?.allowUpdate,
        delete: config.unifi?.allowDelete,
        permissionMode: config.unifi?.permissionMode,
      };
    }
    return entry;
  });
  return { server: "theboringmcp", version: VERSION, readOnly: config.readOnly, apps };
}

/**
 * Baut ein Gateway (ein MCP-Endpunkt für alle Apps). Wird im stdio-Modus
 * einmalig und im HTTP-Modus pro Request aufgerufen (zustandsloser
 * Streamable-HTTP-Transport braucht pro Request eine frische Instanz).
 * Deaktivierte Apps erscheinen hier nirgends: keine Tools, kein Client,
 * kein Prozess.
 */
function buildGateway(config: Config): ToolGateway {
  const { host } = buildNativeHost(config);
  const sources = unifiSource ? [unifiSource] : [];
  return new ToolGateway({
    name: "theboringmcp",
    version: VERSION,
    readOnly: config.readOnly,
    native: host,
    sources,
    statusProvider: (names) => statusDocument(config, names),
  });
}

function logStartup(config: Config) {
  // Alles nach stderr, stdout bleibt für das MCP-Protokoll frei.
  const parts = APP_IDS.map((id) => {
    const st = appState(config.apps[id]);
    return `${APP_LABELS[id]}: ${st === "active" ? "AKTIV" : st === "disabled" ? "AUS (Schalter)" : "nicht konfiguriert"}`;
  });
  console.error(`[TheBoringMCP v${VERSION}] ${parts.join(" | ")}`);
  if (config.readOnly) console.error("[TheBoringMCP] READ_ONLY=true -> schreibende Tools sind deaktiviert.");
}

async function main() {
  const config = loadConfig();
  logStartup(config);

  if (config.unifi) {
    unifiSource = new UnifiSource(config.unifi);
    void unifiSource.start(); // im Hintergrund; schlägt der Start fehl, wird automatisch wiederholt
    const stop = () => {
      void unifiSource?.stop().finally(() => process.exit(0));
    };
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  }

  const transportMode = (process.env.TRANSPORT ?? "stdio").toLowerCase();

  if (transportMode === "http") {
    const port = Number(process.env.PORT ?? 17820);
    startHttpServer(() => buildGateway(config), port, process.env.MCP_HTTP_TOKEN);
    return;
  }

  const gateway = buildGateway(config);
  await gateway.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("[TheBoringMCP] Fataler Fehler beim Start:", error);
  process.exit(1);
});
