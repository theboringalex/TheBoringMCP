import { request } from "./http.js";
import type { ApiKeyConfig } from "../config.js";

/**
 * Gemeinsamer Client für Sonarr (Serien) und Radarr (Filme).
 * Beide sprechen dieselbe REST-Variante (/api/v3, Header X-Api-Key).
 * Den Schlüssel findest du in der App unter Einstellungen → Allgemein → Sicherheit.
 */
export class ArrClient {
  constructor(private readonly cfg: ApiKeyConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api<T = any>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/api/v3${path}`, {
      ...opts,
      headers: { "X-Api-Key": this.cfg.apiKey, ...(opts.headers ?? {}) },
    });
  }
}
