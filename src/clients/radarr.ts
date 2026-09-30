import { request } from "./http.js";
import type { RadarrConfig } from "../config.js";

/** Radarr v3 API (Filme) – strukturell identisch zu Sonarr. */
export class RadarrClient {
  constructor(private readonly cfg: RadarrConfig) {}

  private api<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/api/v3${path}`, {
      ...opts,
      headers: { "X-Api-Key": this.cfg.apiKey, ...(opts.headers ?? {}) },
    });
  }

  getSystemStatus() {
    return this.api<Record<string, unknown>>("/system/status");
  }

  listMovies() {
    return this.api<Array<Record<string, unknown>>>("/movie");
  }

  getMovie(id: number) {
    return this.api<Record<string, unknown>>(`/movie/${id}`);
  }

  lookupMovie(term: string) {
    return this.api<Array<Record<string, unknown>>>("/movie/lookup", { query: { term } });
  }

  addMovie(movie: Record<string, unknown>) {
    return this.api("/movie", { method: "POST", body: movie });
  }

  updateMovie(id: number, movie: Record<string, unknown>) {
    return this.api(`/movie/${id}`, { method: "PUT", body: movie });
  }

  deleteMovie(id: number, deleteFiles = false) {
    return this.api(`/movie/${id}`, { method: "DELETE", query: { deleteFiles } });
  }

  getQueue() {
    return this.api<Record<string, unknown>>("/queue", { query: { pageSize: 100 } });
  }

  removeQueueItem(id: number, removeFromClient = true, blocklist = false) {
    return this.api(`/queue/${id}`, { method: "DELETE", query: { removeFromClient, blocklist } });
  }

  getCalendar(start?: string, end?: string) {
    return this.api<Array<Record<string, unknown>>>("/calendar", { query: { start, end } });
  }

  searchMovie(movieId: number) {
    return this.api("/command", { method: "POST", body: { name: "MoviesSearch", movieIds: [movieId] } });
  }

  rescanMovie(movieId: number) {
    return this.api("/command", { method: "POST", body: { name: "RescanMovie", movieIds: [movieId] } });
  }

  /**
   * Massenbearbeitung mehrerer Filme (z.B. Root-Ordner-Migration).
   * moveFiles=false lässt die DB-Pfade umziehen, ohne Dateien tatsächlich zu
   * verschieben – sinnvoll, wenn die Dateien physisch schon am Zielort liegen
   * (z.B. nach einer NAS-Mount-Restrukturierung).
   */
  bulkEditMovies(
    movieIds: number[],
    changes: {
      rootFolderPath?: string;
      qualityProfileId?: number;
      monitored?: boolean;
      moveFiles?: boolean;
      minimumAvailability?: string;
      tags?: number[];
      applyTags?: "add" | "remove" | "replace";
    },
  ) {
    return this.api("/movie/editor", { method: "PUT", body: { movieIds, ...changes } });
  }

  getRootFolders() {
    return this.api<Array<Record<string, unknown>>>("/rootfolder");
  }

  getQualityProfiles() {
    return this.api<Array<Record<string, unknown>>>("/qualityprofile");
  }
}
