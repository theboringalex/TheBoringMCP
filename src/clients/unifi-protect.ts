import { request, getInsecureAgent } from "./http.js";
import type { UnifiProtectConfig } from "../config.js";

/**
 * UniFi Protect – offizielle Integration-API der UniFi-Konsole
 * (https://<konsole>/proxy/protect/integration/v1, Header X-API-KEY).
 * Den Schlüssel erzeugst du in UniFi unter Einstellungen → Control Plane → Integrationen.
 */
export class UnifiProtectClient {
  constructor(private readonly cfg: UnifiProtectConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api<T = any>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/proxy/protect/integration/v1${path}`, {
      ...opts,
      headers: { "X-API-KEY": this.cfg.apiKey, Accept: "application/json", ...(opts.headers ?? {}) },
      insecureTLS: this.cfg.insecureTls,
    });
  }

  /** Lädt ein Bild (z. B. Kamera-Snapshot) und liefert es als Base64. */
  async image(path: string, query?: Record<string, string>): Promise<{ base64: string; mimeType: string }> {
    const url = new URL(`${this.cfg.baseUrl}/proxy/protect/integration/v1${path}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const init = {
      headers: { "X-API-KEY": this.cfg.apiKey },
      // undici-Erweiterung von fetch (selbstsigniertes Zertifikat)
      dispatcher: this.cfg.insecureTls ? getInsecureAgent() : undefined,
    };
    const res = await fetch(url, init as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} bei ${url.pathname}: ${(await res.text()).slice(0, 300)}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mimeType: res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg" };
  }
}
