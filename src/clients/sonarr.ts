import { request } from "./http.js";
import type { SonarrConfig } from "../config.js";

/** Sonarr v3 API (Serien). */
export class SonarrClient {
  constructor(private readonly cfg: SonarrConfig) {}

  private api<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/api/v3${path}`, {
      ...opts,
      headers: { "X-Api-Key": this.cfg.apiKey, ...(opts.headers ?? {}) },
    });
  }

  getSystemStatus() {
    return this.api<Record<string, unknown>>("/system/status");
  }

  listSeries() {
    return this.api<Array<Record<string, unknown>>>("/series");
  }

  getSeries(id: number) {
    return this.api<Record<string, unknown>>(`/series/${id}`);
  }

  lookupSeries(term: string) {
    return this.api<Array<Record<string, unknown>>>("/series/lookup", { query: { term } });
  }

  addSeries(series: Record<string, unknown>) {
    return this.api("/series", { method: "POST", body: series });
  }

  updateSeries(id: number, series: Record<string, unknown>) {
    return this.api(`/series/${id}`, { method: "PUT", body: series });
  }

  deleteSeries(id: number, deleteFiles = false) {
    return this.api(`/series/${id}`, { method: "DELETE", query: { deleteFiles } });
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

  searchSeries(seriesId: number) {
    return this.api("/command", { method: "POST", body: { name: "SeriesSearch", seriesId } });
  }

  getRootFolders() {
    return this.api<Array<Record<string, unknown>>>("/rootfolder");
  }

  getQualityProfiles() {
    return this.api<Array<Record<string, unknown>>>("/qualityprofile");
  }
}
