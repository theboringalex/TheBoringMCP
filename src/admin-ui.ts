import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { PAGE_HTML } from "./ui/page.js";
import { request } from "./clients/http.js";

/**
 * Einstellungsseite für das Home-Assistant-Add-on (Ingress).
 * - Läuft auf einem eigenen Port (Standard 8099), den nur der Supervisor erreicht.
 * - Liest /data/options.json und schreibt über die Supervisor-API zurück.
 * - Geheimnisse (Schlüssel, Token) werden nie an den Browser geschickt.
 */

const OPTIONS_PATH = "/data/options.json";
const SECRET_KEYS = [
  "mcp_http_token", "ha_token", "portainer_api_key", "jellyfin_api_key", "sonarr_api_key",
  "radarr_api_key", "sabnzbd_api_key", "unifi_api_key", "n8n_api_key",
];
const VERSION = "2.0.2";

type Opts = Record<string, unknown>;

function readOptions(): Opts {
  try {
    return JSON.parse(readFileSync(OPTIONS_PATH, "utf8")) as Opts;
  } catch {
    return {};
  }
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(body));
}

async function supervisor(path: string, body?: unknown) {
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) throw new Error("Kein Supervisor-Token – die Einstellungsseite funktioniert nur als Home-Assistant-Add-on.");
  return request("http://supervisor", path, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: body ?? {} });
}

function clean(url: unknown): string {
  return String(url ?? "").trim().replace(/\/+$/, "");
}

/** Verbindungstest pro Dienst – gibt eine verständliche Meldung zurück. */
async function testService(service: string, values: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const saved = readOptions();
  const pick = (key: string) => {
    const v = values[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : String(saved[key] ?? "");
  };
  const insecure = (key: string) => (typeof values[key] === "boolean" ? (values[key] as boolean) : saved[key] !== false);
  try {
    switch (service) {
      case "ha": {
        const url = clean(pick("ha_url")) || "http://supervisor/core";
        const token = pick("ha_token") || process.env.SUPERVISOR_TOKEN || "";
        const r = await request<{ message?: string }>(url, "/api/", { headers: { Authorization: `Bearer ${token}` } });
        return { ok: true, message: `Verbunden (${r?.message ?? "OK"})` };
      }
      case "sonarr":
      case "radarr": {
        const r = await request<{ version?: string; appName?: string }>(clean(pick(`${service}_url`)), "/api/v3/system/status", {
          headers: { "X-Api-Key": pick(`${service}_api_key`) },
        });
        return { ok: true, message: `Verbunden – ${r.appName ?? service} ${r.version ?? ""}` };
      }
      case "sabnzbd": {
        const r = await request<{ version?: string }>(clean(pick("sabnzbd_url")), "/api", {
          query: { mode: "version", output: "json", apikey: pick("sabnzbd_api_key") },
        });
        // SABnzbd antwortet auf "version" auch ohne gültigen Schlüssel – deshalb zusätzlich Queue prüfen
        await request(clean(pick("sabnzbd_url")), "/api", { query: { mode: "queue", limit: 1, output: "json", apikey: pick("sabnzbd_api_key") } });
        return { ok: true, message: `Verbunden – SABnzbd ${r.version ?? ""}` };
      }
      case "jellyfin": {
        const r = await request<{ ServerName?: string; Version?: string }>(clean(pick("jellyfin_url")), "/System/Info", {
          headers: { Authorization: `MediaBrowser Token="${pick("jellyfin_api_key")}"` },
        });
        return { ok: true, message: `Verbunden – ${r.ServerName ?? "Jellyfin"} ${r.Version ?? ""}` };
      }
      case "portainer": {
        const r = await request<Array<unknown>>(clean(pick("portainer_url")), "/api/endpoints", {
          headers: { "X-API-Key": pick("portainer_api_key") },
          insecureTLS: insecure("portainer_insecure_tls"),
        });
        return { ok: true, message: `Verbunden – ${Array.isArray(r) ? r.length : "?"} Umgebung(en)` };
      }
      case "unifi": {
        const r = await request<{ applicationVersion?: string }>(clean(pick("unifi_url")), "/proxy/network/integration/v1/info", {
          headers: { "X-API-KEY": pick("unifi_api_key") },
          insecureTLS: insecure("unifi_insecure_tls"),
        });
        return { ok: true, message: `Verbunden – UniFi Network ${r.applicationVersion ?? ""}` };
      }
      case "n8n": {
        await request(clean(pick("n8n_url")), "/api/v1/workflows", { query: { limit: 1 }, headers: { "X-N8N-API-KEY": pick("n8n_api_key") } });
        return { ok: true, message: "Verbunden" };
      }
      default:
        return { ok: false, message: "Unbekannter Dienst" };
    }
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    const hint = /ECONNREFUSED|ENOTFOUND|fetch failed|EHOSTUNREACH|timeout/i.test(m)
      ? "Adresse nicht erreichbar – stimmen IP und Port?"
      : /401|403/.test(m) ? "Zugriff verweigert – stimmt der Schlüssel?" : m.slice(0, 180);
    return { ok: false, message: hint };
  }
}

export function startAdminUi(port: number) {
  const server = createServer(async (req, res) => {
    // Nur der Home-Assistant-Supervisor (Ingress-Gateway) darf zugreifen.
    const remote = (req.socket.remoteAddress ?? "").replace("::ffff:", "");
    if (remote !== "172.30.32.2" && remote !== "127.0.0.1" && remote !== "::1") {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const path = (req.url ?? "/").split("?")[0].replace(/\/+$/, "") || "/";
    try {
      if (req.method === "GET" && (path === "/" || path.endsWith("/index.html"))) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(PAGE_HTML);
        return;
      }
      if (req.method === "GET" && path.endsWith("/api/options")) {
        const options = readOptions();
        const secretSet: Record<string, boolean> = {};
        for (const k of SECRET_KEYS) {
          secretSet[k] = typeof options[k] === "string" && (options[k] as string).length > 0;
          delete options[k];
        }
        json(res, 200, { options, secretSet, version: VERSION });
        return;
      }
      if (req.method === "POST" && path.endsWith("/api/options")) {
        const body = await readBody(req);
        const edits = (body.options ?? {}) as Opts;
        const merged: Opts = { ...readOptions() };
        for (const [k, v] of Object.entries(edits)) {
          if (SECRET_KEYS.includes(k) && (v === "" || v === undefined)) continue; // leer = behalten
          merged[k] = typeof v === "string" ? v.trim() : v;
        }
        await supervisor("/addons/self/options", { options: merged });
        json(res, 200, { ok: true });
        if (body.restart) setTimeout(() => supervisor("/addons/self/restart").catch(() => {}), 500);
        return;
      }
      if (req.method === "POST" && path.endsWith("/api/test")) {
        const body = await readBody(req);
        json(res, 200, await testService(String(body.service), (body.values ?? {}) as Record<string, unknown>));
        return;
      }
      res.writeHead(404).end("Not found");
    } catch (e) {
      json(res, 500, { ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  });
  server.listen(port, () => console.error(`[TheBoringMCP] Einstellungsseite (Ingress) auf Port ${port}`));
}
