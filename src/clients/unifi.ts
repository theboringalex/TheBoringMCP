import { request } from "./http.js";
import type { UnifiConfig } from "../config.js";

/**
 * UniFi Network – offizielle Integration-API der UniFi-Konsole bzw. des Gateways
 * (https://<konsole>/proxy/network/integration/v1, Header X-API-KEY).
 * Den Schlüssel erzeugst du in UniFi unter Einstellungen → Control Plane → Integrationen.
 */
export class UnifiClient {
  constructor(private readonly cfg: UnifiConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api<T = any>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/proxy/network/integration/v1${path}`, {
      ...opts,
      headers: { "X-API-KEY": this.cfg.apiKey, Accept: "application/json", ...(opts.headers ?? {}) },
      insecureTLS: this.cfg.insecureTls,
    });
  }
}
