import { request } from "./http.js";
import type { JellyfinConfig } from "../config.js";

/** Jellyfin REST-API mit API-Key-Auth (Dashboard -> API Keys). */
export class JellyfinClient {
  constructor(private readonly cfg: JellyfinConfig) {}

  private api<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, path, {
      ...opts,
      headers: {
        Authorization: `MediaBrowser Token="${this.cfg.apiKey}"`,
        ...(opts.headers ?? {}),
      },
    });
  }

  getSystemInfo() {
    return this.api<Record<string, unknown>>("/System/Info");
  }

  listUsers() {
    return this.api<Array<Record<string, unknown>>>("/Users");
  }

  getSessions() {
    return this.api<Array<Record<string, unknown>>>("/Sessions");
  }

  /** Sendet einen Play/Pause/Stop/Message-Befehl an eine laufende Session. */
  sendSessionCommand(sessionId: string, command: string) {
    return this.api(`/Sessions/${sessionId}/Playing/${command}`, { method: "POST" });
  }

  searchLibrary(searchTerm: string, includeItemTypes?: string) {
    return this.api<Record<string, unknown>>("/Items", {
      query: { searchTerm, includeItemTypes, recursive: true, limit: 50 },
    });
  }

  getLibraries() {
    return this.api<Record<string, unknown>>("/Library/VirtualFolders");
  }

  refreshLibrary() {
    return this.api("/Library/Refresh", { method: "POST" });
  }

  getLatestMedia(userId: string, limit = 20) {
    return this.api<Array<Record<string, unknown>>>(`/Users/${userId}/Items/Latest`, { query: { limit } });
  }

  deleteItem(itemId: string) {
    return this.api(`/Items/${itemId}`, { method: "DELETE" });
  }

  getScheduledTasks() {
    return this.api<Array<Record<string, unknown>>>("/ScheduledTasks");
  }

  runScheduledTask(taskId: string) {
    return this.api(`/ScheduledTasks/Running/${taskId}`, { method: "POST" });
  }
}
