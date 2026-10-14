import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

export function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

/** Rückgabewert eines Tools, das ein Bild liefert (z. B. Kamera-Snapshot). */
export interface ImageResult {
  __image: true;
  base64: string;
  mimeType: string;
}

export function isImage(value: unknown): value is ImageResult {
  return typeof value === "object" && value !== null && (value as ImageResult).__image === true;
}

/**
 * Kleiner Helfer zum Registrieren von Tools:
 *  - fängt Fehler ab und gibt sie als MCP-Fehlerantwort zurück
 *  - sperrt schreibende Tools im READ_ONLY-Modus
 *  - zählt registrierte Tools (für die Start-Logausgabe / 100-Tool-Limit)
 */
export function makeTool(server: McpServer, readOnly: boolean, counter?: { count: number }) {
  return function tool<S extends z.ZodRawShape>(
    name: string,
    description: string,
    shape: S,
    write: boolean | ((args: z.objectOutputType<S, z.ZodTypeAny>) => boolean),
    fn: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>,
  ) {
    if (counter) counter.count++;
    const handler = async (args: unknown) => {
      const isWrite = typeof write === "function" ? write(args as z.objectOutputType<S, z.ZodTypeAny>) : write;
      if (isWrite && readOnly) return fail("Server läuft im READ_ONLY-Modus – schreibende Tools sind gesperrt.");
      try {
        const result = await fn(args as z.objectOutputType<S, z.ZodTypeAny>);
        if (isImage(result)) {
          return { content: [{ type: "image" as const, data: result.base64, mimeType: result.mimeType }] };
        }
        return ok(result === undefined ? "OK" : result);
      } catch (e) {
        return fail(e);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server.tool as any)(name, description, shape, handler);
  };
}

export type ToolFn = ReturnType<typeof makeTool>;

/** Schema für ein generisches "beliebiger API-Aufruf"-Tool (deckt alles ab, was keine eigene Funktion hat). */
export const genericApiShape = {
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().describe("Pfad der API, z. B. /series – ohne Host."),
  query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Query-Parameter"),
  body: z.any().optional().describe("JSON-Body (für POST/PUT/PATCH)"),
};
