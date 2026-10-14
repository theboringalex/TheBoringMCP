import { request } from "./http.js";
import type { JellyfinConfig } from "../config.js";

/** Jellyfin REST-API mit API-Key (Dashboard → API-Schlüssel). */
export class JellyfinClient {
  constructor(private readonly cfg: JellyfinConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api<T = any>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, path, {
      ...opts,
      headers: { Authorization: `MediaBrowser Token="${this.cfg.apiKey}"`, ...(opts.headers ?? {}) },
    });
  }
}
