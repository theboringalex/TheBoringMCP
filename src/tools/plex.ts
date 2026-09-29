import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PlexClient } from "../clients/plex.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

export function registerPlexTools(server: McpServer, client: PlexClient, readOnly: boolean) {
  server.tool("plex_server_info", "Plex-Server-Informationen abrufen (Version, Name, Plattform).", {}, async () => {
    try {
      return ok(await client.getServerInfo());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("plex_list_libraries", "Alle konfigurierten Plex-Bibliotheken (Sections) auflisten.", {}, async () => {
    try {
      return ok(await client.listLibraries());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "plex_list_library_items",
    "Alle Elemente einer Bibliothek auflisten. section_key kommt aus plex_list_libraries.",
    { section_key: z.string(), type: z.string().optional().describe("Plex-Typ-Filter, z.B. '1' (Film), '2' (Serie)") },
    async ({ section_key, type }) => {
      try {
        return ok(await client.listLibraryItems(section_key, type));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "plex_recently_added",
    "Zuletzt hinzugefügte Medien abrufen (optional auf eine Bibliothek eingeschränkt).",
    { section_key: z.string().optional(), limit: z.number().optional().default(20) },
    async ({ section_key, limit }) => {
      try {
        return ok(await client.getRecentlyAdded(section_key, limit));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("plex_search", "Die gesamte Plex-Bibliothek durchsuchen.", { query: z.string() }, async ({ query }) => {
    try {
      return ok(await client.search(query));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("plex_get_item", "Details zu einem einzelnen Medienelement abrufen.", { rating_key: z.string() }, async ({ rating_key }) => {
    try {
      return ok(await client.getItem(rating_key));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("plex_get_sessions", "Aktive Wiedergabe-Sessions abrufen (wer schaut gerade was).", {}, async () => {
    try {
      return ok(await client.getSessions());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "plex_terminate_session",
    "Eine laufende Plex-Wiedergabe-Session abbrechen.",
    { session_id: z.string(), reason: z.string().optional() },
    async ({ session_id, reason }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.terminateSession(session_id, reason));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "plex_refresh_library",
    "Einen Bibliotheks-Scan für eine einzelne Section anstoßen.",
    { section_key: z.string(), force: z.boolean().optional() },
    async ({ section_key, force }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.refreshLibrary(section_key, force));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("plex_refresh_all_libraries", "Einen Scan für alle Bibliotheken anstoßen.", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.refreshAllLibraries());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("plex_empty_trash", "Papierkorb einer Bibliothek leeren (entfernt gelöschte Dateien endgültig aus dem Index).", { section_key: z.string() }, async ({ section_key }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.emptyTrash(section_key));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("plex_mark_watched", "Ein Medienelement als angesehen markieren.", { rating_key: z.string() }, async ({ rating_key }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.markWatched(rating_key));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("plex_mark_unwatched", "Ein Medienelement als nicht angesehen markieren.", { rating_key: z.string() }, async ({ rating_key }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.markUnwatched(rating_key));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "plex_update_metadata",
    "Metadaten eines Elements bearbeiten (Titel, Zusammenfassung, Sortiertitel, ...). Nutze vorher plex_get_item, um den Plex-Typ (movie=1, show=2, season=3, episode=4, artist=8, album=9, track=10) und die aktuellen Werte zu prüfen.",
    {
      rating_key: z.string(),
      type: z.number().describe("Plex-Metadata-Typ-ID, z.B. 1=Film, 2=Serie, 4=Episode"),
      fields: z.record(z.union([z.string(), z.number()])).describe("z.B. {\"title.value\": \"Neuer Titel\", \"title.locked\": 1}"),
    },
    async ({ rating_key, type, fields }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.updateMetadata(rating_key, type, fields));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("plex_delete_item", "Ein Medienelement endgültig aus Plex löschen.", { rating_key: z.string() }, async ({ rating_key }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteItem(rating_key));
    } catch (e) {
      return fail(e);
    }
  });
}
