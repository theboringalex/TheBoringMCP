import { request } from "./http.js";
import type { SabnzbdConfig } from "../config.js";

/** SABnzbd-API (Einstellungen → Allgemein → API-Schlüssel). */
export class SabnzbdClient {
  constructor(private readonly cfg: SabnzbdConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call<T = any>(mode: string, params: Record<string, string | number | boolean | undefined> = {}) {
    return request<T>(this.cfg.baseUrl, "/api", {
      query: { mode, output: "json", apikey: this.cfg.apiKey, ...params },
    });
  }
}
