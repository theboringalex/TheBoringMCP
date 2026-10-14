import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
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
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Zugangs-Token kann auf drei Wegen mitkommen:
 *  1. Header  `Authorization: Bearer <token>`   (Claude Desktop / Claude Code)
 *  2. Pfad    `/<token>/sonarr`                 (Claude.ai – dort gibt es kein Header-Feld)
 *  3. Query   `/sonarr?token=<token>`
 * Gibt den bereinigten Pfad (ohne Token) und den gefundenen URL-Token zurück.
 */
function extractUrlToken(rawUrl: string, authToken?: string): { path: string; urlToken?: string; safeUrl: string } {
  const [pathPart, query = ""] = rawUrl.split("?");
  let path = pathPart || "/";
  let urlToken: string | undefined;
  const segments = path.split("/").filter(Boolean);
  if (authToken && segments.length > 0 && safeEqual(decodeURIComponent(segments[0]), authToken)) {
    urlToken = segments[0];
    path = "/" + segments.slice(1).join("/");
  }
  const params = new URLSearchParams(query);
  if (params.has("token")) {
    urlToken = urlToken ?? params.get("token") ?? undefined;
    params.delete("token");
  }
  const rest = params.toString();
  return { path, urlToken, safeUrl: `${urlToken ? "/<token>" : ""}${path}${rest ? "?" + rest : ""}` };
}

export function startHttpServer(createMcpServer: (pathname: string) => McpServer | undefined, port: number, authToken?: string) {
  const httpServer = createServer((req, res) => {
    const parsed = extractUrlToken(req.url ?? "/", authToken);
    console.error(
      `[TheBoringMCP] Eingehend: ${req.method} ${parsed.safeUrl} von ${req.socket.remoteAddress} ` +
        `(Auth: ${req.headers["authorization"] ? "Header" : parsed.urlToken ? "URL" : "keine"}, Accept: ${req.headers["accept"] ?? "-"}, ` +
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
      console.error(`[TheBoringMCP] Antwort: ${req.method} ${parsed.safeUrl} -> ${res.statusCode}`);
      if (res.statusCode >= 400) {
        const body = Buffer.concat(responseBodyChunks).toString("utf8");
        console.error(`[TheBoringMCP] Fehlerantwort-Body (${res.statusCode}): ${body.slice(0, 500) || "(leer)"}`);
      }
    });

    if (parsed.path === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (authToken) {
      const header = req.headers["authorization"] ?? "";
      const headerOk = safeEqual(header, `Bearer ${authToken}`);
      const urlOk = parsed.urlToken !== undefined && safeEqual(decodeURIComponent(parsed.urlToken), authToken);
      if (!headerOk && !urlOk) {
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
    const pathname = parsed.path;
    const mcpServer = createMcpServer(pathname);
    if (!mcpServer) {
      res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "unknown_path", hint: "Gültige Pfade: / /ha /arr /media /infra /sonarr /radarr /sabnzbd /jellyfin /portainer /unifi /n8n" }));
      return;
    }

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
        `(Pfade: / = alles, /ha, /arr, /media, /infra, Einzeldienste z. B. /sonarr; Health: /healthz)`,
    );
    if (!authToken) {
      console.error("[TheBoringMCP] WARNUNG: Kein MCP_HTTP_TOKEN gesetzt – der Server ist ungeschützt erreichbar!");
    }
  });

  return httpServer;
}
