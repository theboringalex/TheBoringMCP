import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Startet TheBoringMCP als HTTP-Server (Streamable-HTTP-Transport, zustandslos),
 * z.B. für den Betrieb als Home-Assistant-Add-on oder Docker-Container, den
 * Claude per URL erreicht (statt lokal per stdio).
 *
 * Zustandslos deshalb, weil das MCP-SDK bei `sessionIdGenerator: undefined`
 * (kein Session-Tracking) für JEDEN Request eine frische
 * StreamableHTTPServerTransport-Instanz verlangt – eine wiederverwendete
 * Instanz lehnt den zweiten `initialize`-Aufruf mit "Server already
 * initialized" ab. Da unsere Tools ohnehin zustandslose HTTP-Aufrufe gegen
 * HA/Portainer/etc. sind, ist das kein Nachteil: `createMcpServer` baut pro
 * Request eine neue, vollständig konfigurierte McpServer-Instanz.
 *
 * Sicherheit: Wenn MCP_HTTP_TOKEN gesetzt ist, muss jeder Request einen
 * passenden `Authorization: Bearer <token>`-Header mitbringen – sonst
 * gäbe jeder mit Netzwerkzugriff vollen Zugriff auf HA/Portainer/etc.
 */
export function startHttpServer(createMcpServer: (pathname: string) => McpServer, port: number, authToken?: string) {
  const httpServer = createServer((req, res) => {
    console.error(
      `[TheBoringMCP] Eingehend: ${req.method} ${req.url} von ${req.socket.remoteAddress} ` +
        `(Auth-Header vorhanden: ${req.headers["authorization"] ? "ja" : "nein"}, Accept: ${req.headers["accept"] ?? "-"}, ` +
        `Mcp-Session-Id: ${req.headers["mcp-session-id"] ?? "-"}, Content-Type: ${req.headers["content-type"] ?? "-"})`,
    );

    const responseBodyChunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    res.write = ((chunk: unknown, ...rest: unknown[]) => {
      if (chunk && (typeof chunk === "string" || Buffer.isBuffer(chunk))) {
        responseBodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      }
      // @ts-expect-error – Weiterreichen der ursprünglichen write()-Argumente
      return originalWrite(chunk, ...rest);
    }) as typeof res.write;

    res.on("finish", () => {
      console.error(`[TheBoringMCP] Antwort: ${req.method} ${req.url} -> ${res.statusCode}`);
      if (res.statusCode >= 400) {
        const body = Buffer.concat(responseBodyChunks).toString("utf8");
        console.error(`[TheBoringMCP] Fehlerantwort-Body (${res.statusCode}): ${body.slice(0, 500) || "(leer)"}`);
      }
    });

    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (authToken) {
      const header = req.headers["authorization"];
      if (header !== `Bearer ${authToken}`) {
        res.writeHead(401, { "Content-Type": "application/json" }).end(
          JSON.stringify({ error: "unauthorized" }),
        );
        return;
      }
    }

    // Pro Request: frische, zustandslose Transport-/Server-Instanz (siehe Doku oben).
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const pathname = (req.url ?? "/").split("?")[0];
    const mcpServer = createMcpServer(pathname);

    res.on("close", () => {
      transport.close().catch(() => {});
    });

    mcpServer
      .connect(transport)
      .then(() => transport.handleRequest(req, res))
      .catch((error) => {
        console.error("[TheBoringMCP] Fehler bei HTTP-Request:", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "internal_error" }));
        }
      });
  });

  httpServer.listen(port, () => {
    console.error(
      `[TheBoringMCP] HTTP(Streamable)-Transport lauscht auf Port ${port} ` +
        `(Pfad: / = Home Assistant, /rest = alle anderen Dienste, Health: /healthz)`,
    );
    if (!authToken) {
      console.error("[TheBoringMCP] WARNUNG: Kein MCP_HTTP_TOKEN gesetzt – der Server ist ungeschützt erreichbar!");
    }
  });

  return httpServer;
}
