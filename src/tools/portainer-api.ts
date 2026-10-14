import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PortainerClient } from "../clients/portainer.js";
import { genericApiShape, makeTool } from "./common.js";

/** Generalschlüssel für alles in Portainer, was keine eigene Funktion hat. */
export function registerPortainerApiTool(server: McpServer, client: PortainerClient, readOnly: boolean, counter?: { count: number }) {
  const tool = makeTool(server, readOnly, counter);
  tool(
    "portainer_api",
    "Portainer: Generalschlüssel – beliebiger Aufruf der Portainer-API (Pfad ab /api, z. B. /endpoints oder /endpoints/2/docker/networks). GET frei, alles andere nur ohne READ_ONLY.",
    genericApiShape,
    (a) => a.method !== "GET",
    ({ method, path, query, body }) => client.api(path, { method, query, body }),
  );
}
