/**
 * Schlanker HTTP-Helfer auf Basis des eingebauten `fetch` (Node >= 20).
 * Damit brauchen wir keine zusätzliche HTTP-Library als Abhängigkeit.
 */
import { Agent } from "undici";

// Node's globales fetch läuft intern über undici und lehnt selbstsignierte
// TLS-Zertifikate standardmäßig ab (z.B. Portainer im Heimnetz auf
// https://<nas-ip>:9444). Für Dienste, die das per Config explizit anfordern
// (siehe RequestOptions.insecureTLS), verwenden wir einen dedizierten,
// gecachten undici-Agent mit rejectUnauthorized:false statt die
// TLS-Prüfung global abzuschalten.
let insecureAgent: Agent | undefined;
function getInsecureAgent(): Agent {
  if (!insecureAgent) {
    insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
  }
  return insecureAgent;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    url: string,
  ) {
    super(`HTTP ${status} ${statusText} bei ${url}: ${body.slice(0, 500)}`);
    this.name = "HttpError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Wenn true, wird bei Nicht-2xx nicht geworfen, sondern die Response zurückgegeben. */
  raw?: boolean;
  /**
   * Wenn true, wird das TLS-Zertifikat der Gegenstelle nicht validiert.
   * Nur für vertrauenswürdige Dienste im eigenen Heimnetz mit
   * selbstsigniertem Zertifikat setzen (z.B. Portainer), niemals für
   * öffentliche Endpunkte.
   */
  insecureTLS?: boolean;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function request<T = unknown>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(baseUrl, path, options.query);
  const headers: Record<string, string> = { ...options.headers };
  let body: string | undefined;

  if (options.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body,
    // `dispatcher` ist eine undici-spezifische Erweiterung von fetch, die
    // Node's globales (undici-basiertes) fetch unterstützt, um z.B. TLS-
    // Zertifikatsprüfung pro Request abweichend zu konfigurieren.
    dispatcher: options.insecureTLS ? getInsecureAgent() : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, text, url);
  }

  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // Nicht jede API antwortet mit JSON (z.B. Portainer bei 204/leerem Body)
    return text as unknown as T;
  }
}
