import { request } from "./http.js";
import type { PlexConfig } from "../config.js";

/**
 * Plex Media Server API.
 *
 * Plex antwortet standardmäßig mit XML; mit `Accept: application/json` liefert
 * der Server JSON, sodass wir denselben `request()`-Helfer wie bei den
 * anderen Diensten nutzen können. Auth läuft über den Header `X-Plex-Token`
 * (Alternative: Query-Parameter `X-Plex-Token`, hier bewusst als Header
 * gewählt, damit der Token nicht in Logs/URLs landet).
 */
export class PlexClient {
  constructor(private readonly cfg: PlexConfig) {}

  private api<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, path, {
      ...opts,
      headers: {
        "X-Plex-Token": this.cfg.token,
        Accept: "application/json",
        ...(opts.headers ?? {}),
      },
    });
  }

  getServerInfo() {
    return this.api<Record<string, unknown>>("/");
  }

  listLibraries() {
    return this.api<Record<string, unknown>>("/library/sections");
  }

  listLibraryItems(sectionKey: string, type?: string) {
    return this.api<Record<string, unknown>>(`/library/sections/${sectionKey}/all`, {
      query: type ? { type } : undefined,
    });
  }

  getRecentlyAdded(sectionKey?: string, limit = 20) {
    const path = sectionKey ? `/library/sections/${sectionKey}/recentlyAdded` : "/library/recentlyAdded";
    return this.api<Record<string, unknown>>(path, { query: { "X-Plex-Container-Size": limit } });
  }

  search(query: string) {
    return this.api<Record<string, unknown>>("/search", { query: { query } });
  }

  getItem(ratingKey: string) {
    return this.api<Record<string, unknown>>(`/library/metadata/${ratingKey}`);
  }

  getSessions() {
    return this.api<Record<string, unknown>>("/status/sessions");
  }

  /** Bricht eine laufende Wiedergabe-Session ab (z.B. um Bandbreite freizugeben). */
  terminateSession(sessionId: string, reason?: string) {
    return this.api("/status/sessions/terminate", { query: { sessionId, reason } });
  }

  /** Stößt einen Bibliotheks-Scan an (einzelne Section oder alle). */
  refreshLibrary(sectionKey: string, force = false) {
    return this.api(`/library/sections/${sectionKey}/refresh`, {
      method: "PUT",
      query: force ? { force: 1 } : undefined,
    });
  }

  refreshAllLibraries() {
    return this.api("/library/sections/all/refresh", { method: "PUT" });
  }

  emptyTrash(sectionKey: string) {
    return this.api(`/library/sections/${sectionKey}/emptyTrash`, { method: "PUT" });
  }

  /** Markiert ein Medienelement als angesehen/nicht angesehen. */
  markWatched(ratingKey: string) {
    return this.api("/:/scrobble", { query: { key: ratingKey, identifier: "com.plexapp.plugins.library" } });
  }

  markUnwatched(ratingKey: string) {
    return this.api("/:/unscrobble", { query: { key: ratingKey, identifier: "com.plexapp.plugins.library" } });
  }

  /**
   * Bearbeitet Metadaten eines Elements (Titel, Zusammenfassung, Sortiertitel, ...).
   * `fields` z.B. `{ "title.value": "Neuer Titel", "title.locked": 1 }` – siehe
   * Plex-API-Doku "Editing metadata"; `type` ist die Plex-Metadata-Typ-ID
   * (1=movie, 2=show, 4=episode, ...).
   */
  updateMetadata(ratingKey: string, type: number, fields: Record<string, string | number>) {
    return this.api(`/library/metadata/${ratingKey}`, {
      method: "PUT",
      query: { type, id: ratingKey, ...fields },
    });
  }

  deleteItem(ratingKey: string) {
    return this.api(`/library/metadata/${ratingKey}`, { method: "DELETE" });
  }
}
