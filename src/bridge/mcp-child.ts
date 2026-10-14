import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, type CallToolResult, type Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Bindet einen fremden MCP-Server (hier: unifi-network-mcp, Python) als
 * Unterprozess per stdio ein. TheBoringMCP spricht als MCP-Client mit ihm
 * und reicht dessen Tools unverändert (Name, Beschreibung, JSON-Schema) an
 * die eigenen Clients weiter – siehe gateway.ts.
 *
 * Der Prozess ist langlebig und wird von allen (zustandslosen) HTTP-Requests
 * gemeinsam genutzt. Bricht er ab, wird er mit Backoff neu gestartet; die
 * zuletzt bekannte Tool-Liste bleibt dabei erhalten, damit `tools/list`
 * stabil bleibt.
 */

export type BridgeState = "idle" | "starting" | "ready" | "error" | "stopped";

export interface ChildSpec {
  /** Kurzname für Logs, z.B. "unifi". */
  id: string;
  command: string;
  args: string[];
  /** Vollständige Umgebung des Kindprozesses (es wird NICHTS vom Elternprozess geerbt außer PATH/HOME & Co.). */
  env: Record<string, string>;
  /** Wartezeit auf die erste Tool-Liste beim Start. */
  startupTimeoutMs?: number;
}

const LOG = "[TheBoringMCP]";

export class McpChildBridge {
  readonly id: string;
  state: BridgeState = "idle";
  lastError?: string;

  private tools: Tool[] = [];
  private client?: Client;
  private starting?: Promise<void>;
  private retryTimer?: NodeJS.Timeout;
  private retryDelayMs = 5_000;
  private stopped = false;

  constructor(private readonly spec: ChildSpec) {
    this.id = spec.id;
  }

  /** Zuletzt bekannte Tool-Liste des Kindprozesses. */
  listTools(): Tool[] {
    return this.tools;
  }

  /**
   * Startet den Kindprozess und wartet auf die erste Tool-Liste. Wirft nie:
   * Scheitert der Start, wird er im Hintergrund wiederholt (state = "error").
   */
  start(): Promise<void> {
    if (this.starting) return this.starting;
    this.stopped = false;
    this.state = "starting";
    this.starting = this.connectOnce()
      .then(() => {
        this.state = "ready";
        this.lastError = undefined;
        this.retryDelayMs = 5_000;
      })
      .catch((error: unknown) => {
        this.fail(error);
      })
      .finally(() => {
        this.starting = undefined;
      });
    return this.starting;
  }

  private fail(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.state = "error";
    this.lastError = message;
    console.error(`${LOG} ${this.id}: Start/Verbindung fehlgeschlagen: ${message}`);
    this.scheduleRetry();
  }

  private scheduleRetry() {
    if (this.stopped || this.retryTimer) return;
    const delay = this.retryDelayMs;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, 60_000);
    console.error(`${LOG} ${this.id}: neuer Startversuch in ${Math.round(delay / 1000)}s`);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.start();
    }, delay);
    this.retryTimer.unref();
  }

  private async connectOnce(): Promise<void> {
    await this.dispose();

    const transport = new StdioClientTransport({
      command: this.spec.command,
      args: this.spec.args,
      env: this.spec.env,
      stderr: "pipe",
    });

    // Das Log des Kindprozesses (enthält laut Upstream keine Geheimnisse) nach stderr weiterreichen.
    transport.stderr?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split(/\r?\n/)) {
        if (line.trim()) console.error(`${LOG} [${this.id}] ${line}`);
      }
    });

    const client = new Client({ name: "theboringmcp-bridge", version: "1.0.0" });
    client.onclose = () => {
      if (this.client !== client) return; // veraltete Instanz
      this.client = undefined;
      if (this.stopped) return;
      this.state = "error";
      this.lastError = "Kindprozess wurde beendet";
      console.error(`${LOG} ${this.id}: Kindprozess beendet`);
      this.scheduleRetry();
    };
    client.onerror = (error) => {
      console.error(`${LOG} ${this.id}: Client-Fehler: ${error.message}`);
    };

    const timeout = this.spec.startupTimeoutMs ?? 60_000;
    let tools: Tool[];
    try {
      await client.connect(transport, { timeout });
      tools = await this.listAll(client, timeout);
    } catch (error) {
      // Kindprozess nicht als Zombie zurücklassen.
      await client.close().catch(() => undefined);
      throw error;
    }
    this.client = client;
    this.tools = tools;
    console.error(`${LOG} ${this.id}: verbunden, ${tools.length} Tools registriert.`);
  }

  private async listAll(client: Client, timeout: number): Promise<Tool[]> {
    const tools: Tool[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : {}, { timeout });
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    return tools;
  }

  private async requireClient(): Promise<Client> {
    if (this.client) return this.client;
    if (this.starting) await this.starting;
    if (!this.client) {
      throw new Error(
        `${this.id}-Server ist nicht verfügbar (${this.lastError ?? "nicht gestartet"}). ` +
          "Prüfe die Add-on-Logs; ein Neustart wird automatisch versucht.",
      );
    }
    return this.client;
  }

  async callTool(name: string, args: Record<string, unknown> | undefined, timeoutMs = 120_000): Promise<CallToolResult> {
    const client = await this.requireClient();
    const result = await client.callTool({ name, arguments: args ?? {} }, CallToolResultSchema, { timeout: timeoutMs });
    return result as CallToolResult;
  }

  private async dispose() {
    const client = this.client;
    this.client = undefined;
    if (client) await client.close().catch(() => undefined);
  }

  async stop() {
    this.stopped = true;
    this.state = "stopped";
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    await this.dispose();
  }
}
