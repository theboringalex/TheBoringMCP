import { request } from "./http.js";
import type { N8nConfig } from "../config.js";

/** n8n Public API (Einstellungen → n8n API → API-Schlüssel erstellen). */
export class N8nClient {
  constructor(private readonly cfg: N8nConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api<T = any>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/api/v1${path}`, {
      ...opts,
      headers: { "X-N8N-API-KEY": this.cfg.apiKey, Accept: "application/json", ...(opts.headers ?? {}) },
    });
  }

  /** Ruft einen Webhook-Trigger (/webhook/<pfad> bzw. /webhook-test/<pfad>) auf. */
  webhook(path: string, method: string, body: unknown, test: boolean) {
    const clean = path.replace(/^\/+/, "");
    return request(this.cfg.baseUrl, `/${test ? "webhook-test" : "webhook"}/${clean}`, {
      method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      body: method === "GET" ? undefined : body,
    });
  }
}
