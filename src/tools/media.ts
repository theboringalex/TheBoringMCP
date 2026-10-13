import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JellyfinClient } from "../clients/jellyfin.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

export function registerJellyfinTools(server: McpServer, client: JellyfinClient, readOnly: boolean) {
  server.tool("jellyfin_system_info", "Jellyfin-Systeminformationen abrufen.", {}, async () => {
    try {
      return ok(await client.getSystemInfo());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("jellyfin_list_users", "Alle Jellyfin-Benutzer auflisten.", {}, async () => {
    try {
      return ok(await client.listUsers());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("jellyfin_get_sessions", "Aktive Wiedergabe-Sessions abrufen (wer schaut gerade was).", {}, async () => {
    try {
      return ok(await client.getSessions());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "jellyfin_session_command",
    "Einer laufenden Session einen Wiedergabe-Befehl schicken (z.B. 'Pause', 'Unpause', 'Stop').",
    { session_id: z.string(), command: z.string() },
    async ({ session_id, command }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.sendSessionCommand(session_id, command));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("jellyfin_search", "Die Jellyfin-Bibliothek durchsuchen.", { query: z.string(), item_types: z.string().optional().describe("z.B. 'Movie,Series'") }, async ({ query, item_types }) => {
    try {
      return ok(await client.searchLibrary(query, item_types));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("jellyfin_list_libraries", "Konfigurierte Medienbibliotheken auflisten.", {}, async () => {
    try {
      return ok(await client.getLibraries());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("jellyfin_refresh_library", "Einen Bibliotheks-Scan anstoßen.", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.refreshLibrary());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("jellyfin_delete_item", "Ein Medienelement endgültig löschen.", { item_id: z.string() }, async ({ item_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteItem(item_id));
    } catch (e) {
      return fail(e);
    }
  });
}
