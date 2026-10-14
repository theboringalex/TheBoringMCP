import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ArrClient } from "../clients/arr.js";
import { genericApiShape, makeTool } from "./common.js";

type Kind = "sonarr" | "radarr";

/**
 * Registriert alle Tools für Sonarr bzw. Radarr (gemeinsame Basis + je ein
 * spezifischer Teil). Zusätzlich gibt es `<dienst>_api` als Generalschlüssel
 * für alles, was nicht als eigenes Tool existiert.
 */
export function registerArrTools(
  server: McpServer,
  client: ArrClient,
  readOnly: boolean,
  kind: Kind,
  counter?: { count: number },
) {
  const tool = makeTool(server, readOnly, counter);
  const p = kind;
  const label = kind === "sonarr" ? "Sonarr" : "Radarr";

  // ---- Gemeinsame Tools -------------------------------------------------
  tool(`${p}_status`, `${label}: Systemstatus und Version.`, {}, false, () => client.api("/system/status"));
  tool(`${p}_health`, `${label}: Gesundheits-Checks (Warnungen, kaputte Indexer/Download-Clients).`, {}, false, () =>
    client.api("/health"),
  );
  tool(`${p}_disk_space`, `${label}: Freier Speicherplatz aller Laufwerke.`, {}, false, () => client.api("/diskspace"));

  tool(
    `${p}_get_queue`,
    `${label}: Aktuelle Download-Warteschlange.`,
    { page: z.number().int().default(1), page_size: z.number().int().default(100) },
    false,
    ({ page, page_size }) => client.api("/queue", { query: { page, pageSize: page_size, includeUnknownSeriesItems: true } }),
  );
  tool(
    `${p}_remove_queue_item`,
    `${label}: Eintrag aus der Warteschlange entfernen.`,
    { id: z.number().int(), remove_from_client: z.boolean().default(true), blocklist: z.boolean().default(false) },
    true,
    ({ id, remove_from_client, blocklist }) =>
      client.api(`/queue/${id}`, { method: "DELETE", query: { removeFromClient: remove_from_client, blocklist } }),
  );
  tool(`${p}_grab_queue_item`, `${label}: Wartenden Eintrag erzwingen (Grab).`, { id: z.number().int() }, true, ({ id }) =>
    client.api(`/queue/grab/${id}`, { method: "POST" }),
  );

  tool(
    `${p}_get_calendar`,
    `${label}: Kalender (Zeitraum als ISO-Datum, z. B. 2026-10-01).`,
    { start: z.string().optional(), end: z.string().optional() },
    false,
    ({ start, end }) => client.api("/calendar", { query: { start, end } }),
  );
  tool(
    `${p}_get_history`,
    `${label}: Verlauf (Grabs, Importe, Fehler).`,
    { page: z.number().int().default(1), page_size: z.number().int().default(50) },
    false,
    ({ page, page_size }) => client.api("/history", { query: { page, pageSize: page_size, sortKey: "date", sortDirection: "descending" } }),
  );
  tool(
    `${p}_get_wanted_missing`,
    `${label}: Fehlende (gesuchte) Inhalte.`,
    { page: z.number().int().default(1), page_size: z.number().int().default(50) },
    false,
    ({ page, page_size }) => client.api("/wanted/missing", { query: { page, pageSize: page_size } }),
  );
  tool(
    `${p}_get_wanted_cutoff`,
    `${label}: Inhalte, deren Qualitätsgrenze noch nicht erreicht ist.`,
    { page: z.number().int().default(1), page_size: z.number().int().default(50) },
    false,
    ({ page, page_size }) => client.api("/wanted/cutoff", { query: { page, pageSize: page_size } }),
  );

  tool(`${p}_get_root_folders`, `${label}: Root-Ordner.`, {}, false, () => client.api("/rootfolder"));
  tool(`${p}_add_root_folder`, `${label}: Root-Ordner hinzufügen.`, { path: z.string() }, true, ({ path }) =>
    client.api("/rootfolder", { method: "POST", body: { path } }),
  );
  tool(`${p}_delete_root_folder`, `${label}: Root-Ordner entfernen.`, { id: z.number().int() }, true, ({ id }) =>
    client.api(`/rootfolder/${id}`, { method: "DELETE" }),
  );

  tool(`${p}_get_quality_profiles`, `${label}: Qualitätsprofile.`, {}, false, () => client.api("/qualityprofile"));
  tool(
    `${p}_create_quality_profile`,
    `${label}: Qualitätsprofil anlegen (komplettes Profil-Objekt wie von get_quality_profiles).`,
    { profile: z.record(z.any()) },
    true,
    ({ profile }) => client.api("/qualityprofile", { method: "POST", body: profile }),
  );
  tool(
    `${p}_update_quality_profile`,
    `${label}: Qualitätsprofil ändern (komplettes Objekt).`,
    { id: z.number().int(), profile: z.record(z.any()) },
    true,
    ({ id, profile }) => client.api(`/qualityprofile/${id}`, { method: "PUT", body: { ...profile, id } }),
  );
  tool(`${p}_delete_quality_profile`, `${label}: Qualitätsprofil löschen.`, { id: z.number().int() }, true, ({ id }) =>
    client.api(`/qualityprofile/${id}`, { method: "DELETE" }),
  );

  tool(`${p}_get_custom_formats`, `${label}: Custom Formats.`, {}, false, () => client.api("/customformat"));
  tool(
    `${p}_create_custom_format`,
    `${label}: Custom Format anlegen.`,
    { custom_format: z.record(z.any()) },
    true,
    ({ custom_format }) => client.api("/customformat", { method: "POST", body: custom_format }),
  );
  tool(
    `${p}_update_custom_format`,
    `${label}: Custom Format ändern.`,
    { id: z.number().int(), custom_format: z.record(z.any()) },
    true,
    ({ id, custom_format }) => client.api(`/customformat/${id}`, { method: "PUT", body: { ...custom_format, id } }),
  );
  tool(`${p}_delete_custom_format`, `${label}: Custom Format löschen.`, { id: z.number().int() }, true, ({ id }) =>
    client.api(`/customformat/${id}`, { method: "DELETE" }),
  );

  tool(`${p}_get_tags`, `${label}: Tags.`, {}, false, () => client.api("/tag/detail"));
  tool(`${p}_create_tag`, `${label}: Tag anlegen.`, { label: z.string() }, true, ({ label }) =>
    client.api("/tag", { method: "POST", body: { label } }),
  );
  tool(`${p}_delete_tag`, `${label}: Tag löschen.`, { id: z.number().int() }, true, ({ id }) =>
    client.api(`/tag/${id}`, { method: "DELETE" }),
  );

  tool(`${p}_get_download_clients`, `${label}: Konfigurierte Download-Clients.`, {}, false, () => client.api("/downloadclient"));
  tool(`${p}_get_indexers`, `${label}: Konfigurierte Indexer.`, {}, false, () => client.api("/indexer"));

  tool(
    `${p}_search_releases`,
    `${label}: Interaktive Release-Suche für einen Eintrag (liefert Kandidaten inkl. guid/indexerId).`,
    kind === "sonarr"
      ? { series_id: z.number().int().optional(), episode_id: z.number().int().optional(), season_number: z.number().int().optional() }
      : { movie_id: z.number().int() },
    false,
    (a: Record<string, number | undefined>) =>
      client.api("/release", {
        query: kind === "sonarr" ? { seriesId: a.series_id, episodeId: a.episode_id, seasonNumber: a.season_number } : { movieId: a.movie_id },
      }),
  );
  tool(
    `${p}_grab_release`,
    `${label}: Ein Release aus der Release-Suche herunterladen.`,
    { guid: z.string(), indexer_id: z.number().int() },
    true,
    ({ guid, indexer_id }) => client.api("/release", { method: "POST", body: { guid, indexerId: indexer_id } }),
  );
  tool(
    `${p}_run_command`,
    `${label}: Beliebigen Befehl ausführen (z. B. RefreshMonitoredDownloads, RssSync, Backup, MissingEpisodeSearch).`,
    { name: z.string(), params: z.record(z.any()).optional() },
    true,
    ({ name, params }) => client.api("/command", { method: "POST", body: { name, ...(params ?? {}) } }),
  );
  tool(
    `${p}_get_blocklist`,
    `${label}: Blocklist.`,
    { page: z.number().int().default(1), page_size: z.number().int().default(50) },
    false,
    ({ page, page_size }) => client.api("/blocklist", { query: { page, pageSize: page_size } }),
  );
  tool(`${p}_delete_blocklist_item`, `${label}: Eintrag von der Blocklist nehmen.`, { id: z.number().int() }, true, ({ id }) =>
    client.api(`/blocklist/${id}`, { method: "DELETE" }),
  );
  tool(
    `${p}_get_config`,
    `${label}: Einstellungen lesen (type: host, naming, mediamanagement, indexer, downloadclient, ui).`,
    { type: z.enum(["host", "naming", "mediamanagement", "indexer", "downloadclient", "ui"]) },
    false,
    ({ type }) => client.api(`/config/${type}`),
  );
  tool(
    `${p}_update_config`,
    `${label}: Einstellungen ändern (komplettes Objekt inkl. id aus get_config).`,
    { type: z.enum(["host", "naming", "mediamanagement", "indexer", "downloadclient", "ui"]), config: z.record(z.any()) },
    true,
    ({ type, config }) => client.api(`/config/${type}/${(config as { id?: number }).id ?? 1}`, { method: "PUT", body: config }),
  );
  tool(
    `${p}_get_logs`,
    `${label}: Anwendungslog.`,
    { page: z.number().int().default(1), page_size: z.number().int().default(50) },
    false,
    ({ page, page_size }) => client.api("/log", { query: { page, pageSize: page_size, sortKey: "time", sortDirection: "descending" } }),
  );
  tool(
    `${p}_api`,
    `${label}: Generalschlüssel – beliebiger Aufruf der ${label}-API v3 (Pfad ohne /api/v3). GET frei, alles andere nur ohne READ_ONLY.`,
    genericApiShape,
    (a) => a.method !== "GET",
    ({ method, path, query, body }) => client.api(path, { method, query, body }),
  );

  // ---- Sonarr-spezifisch ------------------------------------------------
  if (kind === "sonarr") {
    tool("sonarr_list_series", "Sonarr: Alle Serien der Bibliothek.", {}, false, () => client.api("/series"));
    tool("sonarr_get_series", "Sonarr: Eine Serie im Detail.", { id: z.number().int() }, false, ({ id }) => client.api(`/series/${id}`));
    tool("sonarr_lookup_series", "Sonarr: Serie online suchen (Name oder 'tvdb:12345').", { term: z.string() }, false, ({ term }) =>
      client.api("/series/lookup", { query: { term } }),
    );
    tool(
      "sonarr_add_series",
      "Sonarr: Serie hinzufügen. Entweder über Suchbegriff (term) oder TVDB-ID. Erste Treffer wird verwendet.",
      {
        term: z.string().optional().describe("Suchbegriff, z. B. 'Breaking Bad'"),
        tvdb_id: z.number().int().optional(),
        root_folder_path: z.string(),
        quality_profile_id: z.number().int(),
        monitored: z.boolean().default(true),
        season_folder: z.boolean().default(true),
        series_type: z.enum(["standard", "daily", "anime"]).default("standard"),
        monitor: z.enum(["all", "future", "missing", "existing", "firstSeason", "lastSeason", "latestSeason", "pilot", "none"]).default("all"),
        search_missing: z.boolean().default(true),
        tags: z.array(z.number().int()).optional(),
      },
      true,
      async (a) => {
        const term = a.tvdb_id ? `tvdb:${a.tvdb_id}` : a.term;
        if (!term) throw new Error("Bitte term oder tvdb_id angeben.");
        const found = await client.api<Array<Record<string, unknown>>>("/series/lookup", { query: { term } });
        if (!found.length) throw new Error(`Keine Serie gefunden für '${term}'.`);
        return client.api("/series", {
          method: "POST",
          body: {
            ...found[0],
            rootFolderPath: a.root_folder_path,
            qualityProfileId: a.quality_profile_id,
            monitored: a.monitored,
            seasonFolder: a.season_folder,
            seriesType: a.series_type,
            tags: a.tags ?? [],
            addOptions: { monitor: a.monitor, searchForMissingEpisodes: a.search_missing, searchForCutoffUnmetEpisodes: false },
          },
        });
      },
    );
    tool(
      "sonarr_update_series",
      "Sonarr: Serie ändern. 'changes' wird über die aktuelle Serie gelegt (z. B. {monitored:false, qualityProfileId:4}).",
      { id: z.number().int(), changes: z.record(z.any()), move_files: z.boolean().default(false) },
      true,
      async ({ id, changes, move_files }) => {
        const current = await client.api<Record<string, unknown>>(`/series/${id}`);
        return client.api(`/series/${id}`, { method: "PUT", query: { moveFiles: move_files }, body: { ...current, ...changes } });
      },
    );
    tool(
      "sonarr_delete_series",
      "Sonarr: Serie löschen (optional inkl. Dateien).",
      { id: z.number().int(), delete_files: z.boolean().default(false), add_import_list_exclusion: z.boolean().default(false) },
      true,
      ({ id, delete_files, add_import_list_exclusion }) =>
        client.api(`/series/${id}`, { method: "DELETE", query: { deleteFiles: delete_files, addImportListExclusion: add_import_list_exclusion } }),
    );
    tool(
      "sonarr_bulk_edit_series",
      "Sonarr: Mehrere Serien auf einmal ändern (Monitoring, Profil, Root-Ordner, Tags).",
      {
        series_ids: z.array(z.number().int()),
        changes: z.record(z.any()).describe("z. B. {monitored:true, qualityProfileId:4, rootFolderPath:'/tv', tags:[1], applyTags:'add'}"),
      },
      true,
      ({ series_ids, changes }) => client.api("/series/editor", { method: "PUT", body: { seriesIds: series_ids, ...changes } }),
    );
    tool("sonarr_search_series", "Sonarr: Suche nach allen fehlenden Episoden einer Serie starten.", { series_id: z.number().int() }, true, ({ series_id }) =>
      client.api("/command", { method: "POST", body: { name: "SeriesSearch", seriesId: series_id } }),
    );
    tool(
      "sonarr_search_season",
      "Sonarr: Suche für eine Staffel starten.",
      { series_id: z.number().int(), season_number: z.number().int() },
      true,
      ({ series_id, season_number }) =>
        client.api("/command", { method: "POST", body: { name: "SeasonSearch", seriesId: series_id, seasonNumber: season_number } }),
    );
    tool("sonarr_search_episodes", "Sonarr: Suche für bestimmte Episoden starten.", { episode_ids: z.array(z.number().int()) }, true, ({ episode_ids }) =>
      client.api("/command", { method: "POST", body: { name: "EpisodeSearch", episodeIds: episode_ids } }),
    );
    tool("sonarr_refresh_series", "Sonarr: Metadaten einer Serie aktualisieren.", { series_id: z.number().int() }, true, ({ series_id }) =>
      client.api("/command", { method: "POST", body: { name: "RefreshSeries", seriesId: series_id } }),
    );
    tool("sonarr_rescan_series", "Sonarr: Dateien einer Serie neu einlesen.", { series_id: z.number().int() }, true, ({ series_id }) =>
      client.api("/command", { method: "POST", body: { name: "RescanSeries", seriesId: series_id } }),
    );
    tool("sonarr_list_episodes", "Sonarr: Episoden einer Serie.", { series_id: z.number().int() }, false, ({ series_id }) =>
      client.api("/episode", { query: { seriesId: series_id } }),
    );
    tool(
      "sonarr_set_episode_monitored",
      "Sonarr: Episoden auf überwacht / nicht überwacht stellen.",
      { episode_ids: z.array(z.number().int()), monitored: z.boolean() },
      true,
      ({ episode_ids, monitored }) => client.api("/episode/monitor", { method: "PUT", body: { episodeIds: episode_ids, monitored } }),
    );
    tool("sonarr_get_episode_files", "Sonarr: Episodendateien einer Serie.", { series_id: z.number().int() }, false, ({ series_id }) =>
      client.api("/episodefile", { query: { seriesId: series_id } }),
    );
    tool("sonarr_delete_episode_file", "Sonarr: Episodendatei löschen.", { id: z.number().int() }, true, ({ id }) =>
      client.api(`/episodefile/${id}`, { method: "DELETE" }),
    );
    tool("sonarr_get_languages", "Sonarr: Verfügbare Sprachen.", {}, false, () => client.api("/language"));
  }

  // ---- Radarr-spezifisch ------------------------------------------------
  if (kind === "radarr") {
    tool("radarr_list_movies", "Radarr: Alle Filme der Bibliothek.", {}, false, () => client.api("/movie"));
    tool("radarr_get_movie", "Radarr: Ein Film im Detail.", { id: z.number().int() }, false, ({ id }) => client.api(`/movie/${id}`));
    tool("radarr_lookup_movie", "Radarr: Film online suchen (Name oder 'tmdb:123').", { term: z.string() }, false, ({ term }) =>
      client.api("/movie/lookup", { query: { term } }),
    );
    tool(
      "radarr_add_movie",
      "Radarr: Film hinzufügen – per Suchbegriff (term) oder TMDB-ID. Erster Treffer wird verwendet.",
      {
        term: z.string().optional(),
        tmdb_id: z.number().int().optional(),
        root_folder_path: z.string(),
        quality_profile_id: z.number().int(),
        monitored: z.boolean().default(true),
        minimum_availability: z.enum(["announced", "inCinemas", "released"]).default("released"),
        search_now: z.boolean().default(true),
        tags: z.array(z.number().int()).optional(),
      },
      true,
      async (a) => {
        const term = a.tmdb_id ? `tmdb:${a.tmdb_id}` : a.term;
        if (!term) throw new Error("Bitte term oder tmdb_id angeben.");
        const found = await client.api<Array<Record<string, unknown>>>("/movie/lookup", { query: { term } });
        if (!found.length) throw new Error(`Kein Film gefunden für '${term}'.`);
        return client.api("/movie", {
          method: "POST",
          body: {
            ...found[0],
            rootFolderPath: a.root_folder_path,
            qualityProfileId: a.quality_profile_id,
            monitored: a.monitored,
            minimumAvailability: a.minimum_availability,
            tags: a.tags ?? [],
            addOptions: { searchForMovie: a.search_now },
          },
        });
      },
    );
    tool(
      "radarr_update_movie",
      "Radarr: Film ändern. 'changes' wird über den aktuellen Film gelegt (z. B. {monitored:false}).",
      { id: z.number().int(), changes: z.record(z.any()), move_files: z.boolean().default(false) },
      true,
      async ({ id, changes, move_files }) => {
        const current = await client.api<Record<string, unknown>>(`/movie/${id}`);
        return client.api(`/movie/${id}`, { method: "PUT", query: { moveFiles: move_files }, body: { ...current, ...changes } });
      },
    );
    tool(
      "radarr_delete_movie",
      "Radarr: Film löschen (optional inkl. Dateien).",
      { id: z.number().int(), delete_files: z.boolean().default(false), add_import_exclusion: z.boolean().default(false) },
      true,
      ({ id, delete_files, add_import_exclusion }) =>
        client.api(`/movie/${id}`, { method: "DELETE", query: { deleteFiles: delete_files, addImportExclusion: add_import_exclusion } }),
    );
    tool(
      "radarr_bulk_edit_movies",
      "Radarr: Mehrere Filme auf einmal ändern (Monitoring, Profil, Root-Ordner, Tags).",
      {
        movie_ids: z.array(z.number().int()),
        changes: z.record(z.any()).describe("z. B. {monitored:true, qualityProfileId:4, rootFolderPath:'/movies', tags:[1], applyTags:'add', moveFiles:false}"),
      },
      true,
      ({ movie_ids, changes }) => client.api("/movie/editor", { method: "PUT", body: { movieIds: movie_ids, ...changes } }),
    );
    tool("radarr_search_movie", "Radarr: Suche für Filme starten.", { movie_ids: z.array(z.number().int()) }, true, ({ movie_ids }) =>
      client.api("/command", { method: "POST", body: { name: "MoviesSearch", movieIds: movie_ids } }),
    );
    tool("radarr_refresh_movie", "Radarr: Metadaten eines Films aktualisieren.", { movie_id: z.number().int() }, true, ({ movie_id }) =>
      client.api("/command", { method: "POST", body: { name: "RefreshMovie", movieIds: [movie_id] } }),
    );
    tool("radarr_rescan_movie", "Radarr: Dateien eines Films neu einlesen.", { movie_id: z.number().int() }, true, ({ movie_id }) =>
      client.api("/command", { method: "POST", body: { name: "RescanMovie", movieId: movie_id } }),
    );
    tool("radarr_get_movie_files", "Radarr: Dateien eines Films.", { movie_id: z.number().int() }, false, ({ movie_id }) =>
      client.api("/moviefile", { query: { movieId: movie_id } }),
    );
    tool("radarr_delete_movie_file", "Radarr: Moviedatei löschen.", { id: z.number().int() }, true, ({ id }) =>
      client.api(`/moviefile/${id}`, { method: "DELETE" }),
    );
  }
}
