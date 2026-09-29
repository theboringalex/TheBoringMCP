import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarrClient } from "../clients/sonarr.js";
import type { RadarrClient } from "../clients/radarr.js";
import type { SabnzbdClient } from "../clients/sabnzbd.js";
import type { JellyfinClient } from "../clients/jellyfin.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

export function registerSonarrTools(server: McpServer, client: SonarrClient, readOnly: boolean) {
  server.tool("sonarr_status", "Sonarr-Systemstatus abrufen.", {}, async () => {
    try {
      return ok(await client.getSystemStatus());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_list_series", "Alle in Sonarr verwalteten Serien auflisten.", {}, async () => {
    try {
      return ok(await client.listSeries());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_lookup_series", "Nach einer Serie suchen (TheTVDB), um Metadaten vor dem Hinzufügen zu prüfen.", { term: z.string() }, async ({ term }) => {
    try {
      return ok(await client.lookupSeries(term));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "sonarr_add_series",
    "Eine neue Serie zu Sonarr hinzufügen. Nutze vorher sonarr_lookup_series, sonarr_get_root_folders und sonarr_get_quality_profiles, um die Series-Objekt-Felder korrekt zu befüllen.",
    { series: z.record(z.unknown()) },
    async ({ series }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.addSeries(series));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("sonarr_delete_series", "Eine Serie aus Sonarr entfernen.", { series_id: z.number(), delete_files: z.boolean().optional() }, async ({ series_id, delete_files }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteSeries(series_id, delete_files));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_get_queue", "Aktuelle Download-Queue von Sonarr abrufen.", {}, async () => {
    try {
      return ok(await client.getQueue());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_remove_queue_item", "Einen Eintrag aus der Sonarr-Queue entfernen.", { id: z.number(), blocklist: z.boolean().optional() }, async ({ id, blocklist }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.removeQueueItem(id, true, blocklist));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_get_calendar", "Anstehende Episoden-Ausstrahlungen abrufen.", { start: z.string().optional(), end: z.string().optional() }, async ({ start, end }) => {
    try {
      return ok(await client.getCalendar(start, end));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_search_series", "Eine manuelle Suche für alle Episoden einer Serie anstoßen.", { series_id: z.number() }, async ({ series_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.searchSeries(series_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_get_root_folders", "Konfigurierte Root-Ordner abrufen.", {}, async () => {
    try {
      return ok(await client.getRootFolders());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_get_quality_profiles", "Konfigurierte Qualitätsprofile abrufen.", {}, async () => {
    try {
      return ok(await client.getQualityProfiles());
    } catch (e) {
      return fail(e);
    }
  });
}

export function registerRadarrTools(server: McpServer, client: RadarrClient, readOnly: boolean) {
  server.tool("radarr_status", "Radarr-Systemstatus abrufen.", {}, async () => {
    try {
      return ok(await client.getSystemStatus());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_list_movies", "Alle in Radarr verwalteten Filme auflisten.", {}, async () => {
    try {
      return ok(await client.listMovies());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_lookup_movie", "Nach einem Film suchen (TMDb), um Metadaten vor dem Hinzufügen zu prüfen.", { term: z.string() }, async ({ term }) => {
    try {
      return ok(await client.lookupMovie(term));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "radarr_add_movie",
    "Einen neuen Film zu Radarr hinzufügen. Nutze vorher radarr_lookup_movie, radarr_get_root_folders und radarr_get_quality_profiles.",
    { movie: z.record(z.unknown()) },
    async ({ movie }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.addMovie(movie));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("radarr_delete_movie", "Einen Film aus Radarr entfernen.", { movie_id: z.number(), delete_files: z.boolean().optional() }, async ({ movie_id, delete_files }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteMovie(movie_id, delete_files));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_get_queue", "Aktuelle Download-Queue von Radarr abrufen.", {}, async () => {
    try {
      return ok(await client.getQueue());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_remove_queue_item", "Einen Eintrag aus der Radarr-Queue entfernen.", { id: z.number(), blocklist: z.boolean().optional() }, async ({ id, blocklist }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.removeQueueItem(id, true, blocklist));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_get_calendar", "Anstehende Kinostarts/Veröffentlichungen abrufen.", { start: z.string().optional(), end: z.string().optional() }, async ({ start, end }) => {
    try {
      return ok(await client.getCalendar(start, end));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_search_movie", "Eine manuelle Suche für einen Film anstoßen.", { movie_id: z.number() }, async ({ movie_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.searchMovie(movie_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_get_root_folders", "Konfigurierte Root-Ordner abrufen.", {}, async () => {
    try {
      return ok(await client.getRootFolders());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("radarr_get_quality_profiles", "Konfigurierte Qualitätsprofile abrufen.", {}, async () => {
    try {
      return ok(await client.getQualityProfiles());
    } catch (e) {
      return fail(e);
    }
  });
}

export function registerSabnzbdTools(server: McpServer, client: SabnzbdClient, readOnly: boolean) {
  server.tool("sabnzbd_get_queue", "Aktuelle SABnzbd-Download-Queue abrufen.", {}, async () => {
    try {
      return ok(await client.getQueue());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_get_history", "SABnzbd-Download-Historie abrufen.", { limit: z.number().optional().default(50) }, async ({ limit }) => {
    try {
      return ok(await client.getHistory(limit));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_pause_queue", "Gesamte SABnzbd-Queue pausieren.", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.pauseQueue());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_resume_queue", "Gesamte SABnzbd-Queue fortsetzen.", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.resumeQueue());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_delete_job", "Einen Download aus der Queue löschen.", { nzo_id: z.string(), delete_files: z.boolean().optional() }, async ({ nzo_id, delete_files }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteJob(nzo_id, delete_files));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_add_by_url", "Einen NZB-Download per URL hinzufügen.", { url: z.string(), name: z.string().optional(), category: z.string().optional() }, async ({ url, name, category }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.addByUrl(url, name, category));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_set_speed_limit", "Geschwindigkeitslimit setzen (z.B. '50' für 50% oder '2000K').", { value: z.string() }, async ({ value }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.setSpeedLimit(value));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sabnzbd_server_stats", "Übertragungsstatistiken abrufen.", {}, async () => {
    try {
      return ok(await client.getServerStats());
    } catch (e) {
      return fail(e);
    }
  });
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
