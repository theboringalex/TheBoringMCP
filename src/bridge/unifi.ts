import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type { UnifiConfig } from "../config.js";
import type { ToolSource } from "../gateway.js";
import { McpChildBridge } from "./mcp-child.js";

/**
 * UniFi-Anbindung: bindet `unifi-network-mcp` (sirkirby/unifi-mcp, Python,
 * ~210 Tools) als Unterprozess ein. Das Kind läuft IMMER im Modus "eager",
 * damit wir alle Tool-Annotationen (readOnlyHint) kennen – nötig für den
 * READ_ONLY-Schutz bei `unifi_execute`/`unifi_batch`. Was Clients in
 * `tools/list` sehen, steuert `unifi_tool_mode`.
 */

/** Meta-Tools, die im Modus "meta_only" sichtbar sind. */
// (unifi_load_tools gibt es nur im Lazy-Modus des Kindes; wir brauchen es nicht – unifi_execute erreicht alle Tools.)
const META_TOOLS = ["unifi_tool_index", "unifi_execute", "unifi_batch", "unifi_batch_status"];
/** Zusätzlich im Modus "lazy" (entspricht dem Upstream-Verhalten). */
const LAZY_EXTRA = ["unifi_get_support_bundle", "unifi_get_incident_evidence", "unifi_get_client_details"];

export function buildUnifiEnv(cfg: UnifiConfig): Record<string, string> {
  const env: Record<string, string> = {};
  // Nur das Nötigste vom Elternprozess erben – keine anderen Geheimnisse (HA_TOKEN, GITHUB_TOKEN, ...).
  for (const key of ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "SSL_CERT_FILE", "VIRTUAL_ENV"]) {
    const v = process.env[key];
    if (v) env[key] = v;
  }
  env.UNIFI_HOST = cfg.host;
  env.UNIFI_PORT = String(cfg.port);
  env.UNIFI_SITE = cfg.site;
  env.UNIFI_VERIFY_SSL = cfg.verifySsl ? "true" : "false";
  if (cfg.apiKey) env.UNIFI_API_KEY = cfg.apiKey;
  if (cfg.username) env.UNIFI_USERNAME = cfg.username;
  if (cfg.password) env.UNIFI_PASSWORD = cfg.password;
  env.UNIFI_TOOL_REGISTRATION_MODE = "eager";
  env.UNIFI_DEFER_CONTROLLER_INIT = "true";
  env.UNIFI_TOOL_PERMISSION_MODE = cfg.permissionMode;
  const flag = (b: boolean) => (b ? "true" : "false");
  env.UNIFI_POLICY_NETWORK_CREATE = flag(cfg.allowCreate);
  env.UNIFI_POLICY_NETWORK_UPDATE = flag(cfg.allowUpdate);
  env.UNIFI_POLICY_NETWORK_DELETE = flag(cfg.allowDelete);
  return env;
}

export class UnifiSource implements ToolSource {
  readonly id = "unifi";
  readonly bridge: McpChildBridge;

  constructor(private readonly cfg: UnifiConfig) {
    this.bridge = new McpChildBridge({
      id: "unifi",
      command: cfg.command,
      args: cfg.args,
      env: buildUnifiEnv(cfg),
    });
  }

  start(): Promise<void> {
    return this.bridge.start();
  }

  stop(): Promise<void> {
    return this.bridge.stop();
  }

  get state() {
    return { state: this.bridge.state, lastError: this.bridge.lastError };
  }

  owns(name: string): boolean {
    return name.startsWith("unifi_");
  }

  listAll(): Tool[] {
    return this.bridge.listTools();
  }

  listVisible(): Tool[] {
    const all = this.bridge.listTools();
    switch (this.cfg.toolMode) {
      case "eager":
        return all;
      case "meta_only":
        return all.filter((t) => META_TOOLS.includes(t.name));
      default:
        return all.filter((t) => META_TOOLS.includes(t.name) || LAZY_EXTRA.includes(t.name));
    }
  }

  private isReadOnlyTool(name: string): boolean {
    if (name === "unifi_tool_index" || name === "unifi_batch_status") return true;
    const tool = this.bridge.listTools().find((t) => t.name === name);
    return tool?.annotations?.readOnlyHint === true;
  }

  readOnlyViolation(name: string, args: Record<string, unknown> | undefined): string | undefined {
    if (name === "unifi_execute") {
      const target = typeof args?.tool === "string" ? args.tool : "";
      if (!this.isReadOnlyTool(target)) return `unifi_execute darf '${target || "?"}' nicht ausführen (nicht als nur-lesend bekannt).`;
      return undefined;
    }
    if (name === "unifi_batch") {
      const ops = Array.isArray(args?.operations) ? (args.operations as Array<Record<string, unknown>>) : [];
      for (const op of ops) {
        const target = typeof op?.tool === "string" ? op.tool : typeof op?.name === "string" ? op.name : "";
        if (!this.isReadOnlyTool(target)) return `unifi_batch enthält '${target || "?"}' (nicht als nur-lesend bekannt).`;
      }
      return undefined;
    }
    if (!this.isReadOnlyTool(name)) return `'${name}' ist ein schreibendes UniFi-Tool.`;
    return undefined;
  }

  call(name: string, args: Record<string, unknown> | undefined): Promise<CallToolResult> {
    return this.bridge.callTool(name, args);
  }
}
