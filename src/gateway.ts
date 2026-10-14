import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Gateway: ein einziger MCP-Endpunkt für alle Apps.
 *
 * - "Native" Tools (Home Assistant, Portainer, Jellyfin, Plex, GitHub) liegen
 *   wie bisher in einer McpServer-Instanz. Das Gateway spricht per
 *   In-Memory-Transport mit ihr (reine öffentliche SDK-API, keine
 *   Interna) und reicht `tools/list`/`tools/call` durch.
 * - "Bridged" Tools (UniFi, Python-Unterprozess) kommen über eine
 *   ToolSource und werden mit ihrem Original-JSON-Schema weitergereicht.
 * - `tbm_status` ist ein virtuelles Tool, das den Zugriffsstatus aller Apps
 *   zeigt (aktiv / deaktiviert / nicht konfiguriert) – auch dann, wenn
 *   sonst gar kein Tool aktiv ist.
 *
 * Das Gateway ist zustandslos pro Request nutzbar (wie bisher der McpServer
 * im HTTP-Modus): `connect()` baut alles auf, `close()` räumt auf.
 */

export interface ToolSource {
  /** App-ID, z.B. "unifi". */
  readonly id: string;
  /** Gehört dieser Tool-Name zu dieser Quelle (auch nicht gelistete)? */
  owns(name: string): boolean;
  /** Tools, die Clients in `tools/list` sehen. */
  listVisible(): Tool[];
  /** Alle bekannten Tools (für Statistik/Zählung). */
  listAll(): Tool[];
  /** Tool ausführen. Wirft bei Verbindungsproblemen. */
  call(name: string, args: Record<string, unknown> | undefined): Promise<CallToolResult>;
  /** Gibt einen Ablehnungsgrund zurück, falls der Aufruf im READ_ONLY-Modus nicht erlaubt ist. */
  readOnlyViolation?(name: string, args: Record<string, unknown> | undefined): string | undefined;
}

export interface NativeToolHost {
  server: McpServer;
  /** Wird beim Schließen aufgerufen (z.B. WebSocket-Verbindungen beenden). */
  dispose?: () => void;
}

export interface GatewayOptions {
  name: string;
  version: string;
  readOnly: boolean;
  /** Frisch gebauter Host mit den nativen Tools (oder undefined, wenn keine native App aktiv ist). */
  native?: NativeToolHost;
  sources: ToolSource[];
  /** Liefert das Status-Dokument für `tbm_status` (bekommt die Namen aller aktuell gelisteten Tools). */
  statusProvider: (toolNames: string[]) => unknown;
}

const STATUS_TOOL: Tool = {
  name: "tbm_status",
  description:
    "TheBoringMCP: Zugriffsstatus aller Apps (Home Assistant, Portainer, UniFi, Jellyfin, Plex, GitHub) – " +
    "aktiv, per Schalter deaktiviert oder nicht konfiguriert – inklusive Anzahl der bereitgestellten Tools.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, title: "TheBoringMCP-Status" },
};

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: `Fehler: ${message}` }], isError: true };
}

export class ToolGateway {
  private readonly server: Server;
  private nativeClient?: Client;
  private nativeReady?: Promise<Client>;

  constructor(private readonly opts: GatewayOptions) {
    this.server = new Server(
      { name: opts.name, version: opts.version },
      { capabilities: { tools: { listChanged: false } } },
    );
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: await this.listTools() }));
    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.callTool(request.params.name, request.params.arguments as Record<string, unknown> | undefined),
    );
  }

  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
  }

  async close(): Promise<void> {
    await this.server.close().catch(() => undefined);
    await this.nativeClient?.close().catch(() => undefined);
    await this.opts.native?.server.close().catch(() => undefined);
    this.opts.native?.dispose?.();
  }

  /** Verbindet (lazy, einmalig pro Gateway) den In-Memory-Client mit dem nativen McpServer. */
  private ensureNative(): Promise<Client> | undefined {
    const host = this.opts.native;
    if (!host) return undefined;
    if (!this.nativeReady) {
      this.nativeReady = (async () => {
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        await host.server.connect(serverSide);
        const client = new Client({ name: "theboringmcp-gateway", version: this.opts.version });
        await client.connect(clientSide);
        this.nativeClient = client;
        return client;
      })();
    }
    return this.nativeReady;
  }

  private async listNative(): Promise<Tool[]> {
    const ready = this.ensureNative();
    if (!ready) return [];
    const client = await ready;
    const tools: Tool[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : {});
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    return tools;
  }

  private async listTools(): Promise<Tool[]> {
    const native = await this.listNative();
    const bridged = this.opts.sources.flatMap((s) => s.listVisible());
    const seen = new Set<string>();
    const merged: Tool[] = [];
    for (const tool of [...native, ...bridged, STATUS_TOOL]) {
      if (seen.has(tool.name)) continue; // erste Definition gewinnt, keine Doppelungen
      seen.add(tool.name);
      merged.push(tool);
    }
    return merged;
  }

  private async callTool(name: string, args: Record<string, unknown> | undefined): Promise<CallToolResult> {
    try {
      if (name === STATUS_TOOL.name) {
        const names = (await this.listTools()).map((t) => t.name);
        return { content: [{ type: "text", text: JSON.stringify(this.opts.statusProvider(names), null, 2) }] };
      }

      const source = this.opts.sources.find((s) => s.owns(name));
      if (source) {
        if (this.opts.readOnly) {
          const violation = source.readOnlyViolation?.(name, args);
          if (violation) return errorResult(`Server läuft im READ_ONLY-Modus: ${violation}`);
        }
        return await source.call(name, args);
      }

      const ready = this.ensureNative();
      if (!ready) return errorResult(`Tool '${name}' ist nicht verfügbar (App deaktiviert oder nicht konfiguriert, siehe tbm_status).`);
      const client = await ready;
      const result = await client.callTool({ name, arguments: args ?? {} }, CallToolResultSchema, {
        timeout: 300_000,
        resetTimeoutOnProgress: true,
      });
      return result as CallToolResult;
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error));
    }
  }
}
