import { request } from "./http.js";
import type { SabnzbdConfig } from "../config.js";

/** SABnzbd API – nutzt klassisches ?mode=... Query-Interface mit output=json. */
export class SabnzbdClient {
  constructor(private readonly cfg: SabnzbdConfig) {}

  private api<T>(mode: string, extra: Record<string, string | number | boolean | undefined> = {}) {
    return request<T>(this.cfg.baseUrl, "/api", {
      query: { mode, output: "json", apikey: this.cfg.apiKey, ...extra },
    });
  }

  getQueue() {
    return this.api<Record<string, unknown>>("queue");
  }

  getHistory(limit = 50) {
    return this.api<Record<string, unknown>>("history", { limit });
  }

  pauseQueue() {
    return this.api("pause");
  }

  resumeQueue() {
    return this.api("resume");
  }

  pauseJob(nzoId: string) {
    return this.api("queue", { name: "pause", value: nzoId });
  }

  resumeJob(nzoId: string) {
    return this.api("queue", { name: "resume", value: nzoId });
  }

  deleteJob(nzoId: string, deleteFiles = true) {
    return this.api("queue", { name: "delete", value: nzoId, del_files: deleteFiles ? 1 : 0 });
  }

  deleteHistoryEntry(nzoId: string, deleteFiles = true) {
    return this.api("history", { name: "delete", value: nzoId, del_files: deleteFiles ? 1 : 0 });
  }

  addByUrl(url: string, name?: string, category?: string) {
    return this.api("addurl", { name: url, nzbname: name, cat: category });
  }

  setSpeedLimit(percentOrValue: string) {
    return this.api("config", { name: "speedlimit", value: percentOrValue });
  }

  getServerStats() {
    return this.api<Record<string, unknown>>("server_stats");
  }

  getFullStatus() {
    return this.api<Record<string, unknown>>("fullstatus");
  }
}
