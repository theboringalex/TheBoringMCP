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

  server.tool("sonarr_get_languages", "Verfügbare Sprachen abrufen (für das 'language'-Feld eines Qualitätsprofils, Sonarr v4).", {}, async () => {
    try {
      return ok(await client.getLanguages());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("sonarr_get_custom_formats", "Konfigurierte Custom Formats abrufen.", {}, async () => {
    try {
      return ok(await client.getCustomFormats());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "sonarr_create_custom_format",
    "Ein neues Custom Format anlegen (z.B. um Staffelpakete per ReleaseTypeSpecification zu bevorzugen). Objekt-Form: { name, includeCustomFormatWhenRenaming, specifications: [{ name, implementation, negate, required, fields: [{ name, value }] }] }.",
    { custom_format: z.record(z.unknown()) },
    async ({ custom_format }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createCustomFormat(custom_format));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "sonarr_create_quality_profile",
    "Ein neues Qualitätsprofil anlegen. Nutze vorher sonarr_get_quality_profiles (als Vorlage für 'items'), sonarr_get_languages (für das 'language'-Feld) und ggf. sonarr_get_custom_formats/sonarr_create_custom_format (für 'formatItems'). Objekt-Form wie von sonarr_get_quality_profiles zurückgegeben, ohne 'id'.",
    { profile: z.record(z.unknown()) },
    async ({ profile }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createQualityProfile(profile));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "sonarr_update_quality_profile",
    "Ein bestehendes Qualitätsprofil aktualisieren (vollständiges Objekt, inkl. 'id').",
    { profile_id: z.number(), profile: z.record(z.unknown()) },
    async ({ profile_id, profile }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.updateQualityProfile(profile_id, profile));
      } catch (e) {
        return fail(e);
      }
    },
  );
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

  server.tool("radarr_get_movie", "Vollständiges Film-Objekt eines einzelnen Films abrufen (z.B. um es vor radarr_update_movie zu bearbeiten).", { movie_id: z.number() }, async ({ movie_id }) => {
    try {
      return ok(await client.getMovie(movie_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "radarr_update_movie",
    "Ein bestehendes Film-Objekt aktualisieren (PUT /movie/{id}). Erwartet das vollständige, zuvor per radarr_get_movie geholte und angepasste Objekt.",
    { movie_id: z.number(), movie: z.record(z.unknown()) },
    async ({ movie_id, movie }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.updateMovie(movie_id, movie));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "radarr_bulk_edit_movies",
    "Mehrere Filme gleichzeitig bearbeiten (z.B. Root-Ordner-Migration nach einer NAS-Umstellung). move_files=false lässt nur den DB-Pfad umziehen, ohne Dateien zu verschieben - sinnvoll, wenn die Dateien physisch bereits am Zielordner liegen.",
    {
      movie_ids: z.array(z.number()),
      root_folder_path: z.string().optional(),
      quality_profile_id: z.number().optional(),
      monitored: z.boolean().optional(),
      move_files: z.boolean().optional(),
      minimum_availability: z.string().optional(),
      tags: z.array(z.number()).optional(),
      apply_tags: z.enum(["add", "remove", "replace"]).optional(),
    },
    async ({ movie_ids, root_folder_path, quality_profile_id, monitored, move_files, minimum_availability, tags, apply_tags }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(
          await client.bulkEditMovies(movie_ids, {
            rootFolderPath: root_folder_path,
            qualityProfileId: quality_profile_id,
            monitored,
            moveFiles: move_files,
            minimumAvailability: minimum_availability,
            tags,
            applyTags: apply_tags,
          }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("radarr_rescan_movie", "Den Film-Ordner eines Films neu einlesen (Command RescanMovie) - z.B. nach einer Pfad-Korrektur, um bereits vorhandene Dateien zu erkennen.", { movie_id: z.number() }, async ({ movie_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.rescanMovie(movie_id));
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
