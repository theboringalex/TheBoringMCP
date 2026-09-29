import WebSocket from "ws";
import type { HomeAssistantConfig } from "../config.js";

/**
 * Client für die Home-Assistant-WebSocket-API (`/api/websocket`).
 *
 * Ein großer Teil der HA-Registries und Storage-Collections ist NUR über
 * diese API erreichbar, nicht über die REST-API unter `/api` (die von
 * `homeassistant.ts` genutzt wird): Areas, Floors, Labels, Categories,
 * Geräte-/Entity-Registry, Helper (input_*, counter, timer, schedule,
 * zone, person, tag), Lovelace-Dashboards & -Resources, Energie-Prefs,
 * Assist-Pipelines, Config-Entries, Traces, Backups, Blueprints, ...
 *
 * Hält eine einzige, wiederverwendete Verbindung pro Prozess und baut sie
 * bei Bedarf automatisch neu auf (Verbindungsverlust, erster Aufruf).
 */
export class HomeAssistantWsClient {
  private ws?: WebSocket;
  private connecting?: Promise<WebSocket>;
  private msgId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  private authed = false;

  constructor(private readonly cfg: HomeAssistantConfig) {}

  private wsUrl(): string {
    const url = new URL(this.cfg.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/api/websocket`;
    url.search = "";
    return url.toString();
  }

  private connect(): Promise<WebSocket> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.authed) {
      return Promise.resolve(this.ws);
    }
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl());
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        ws.terminate();
        reject(new Error("Home Assistant WebSocket: Timeout bei Verbindungsaufbau/Auth (15s)"));
      }, 15000);

      const settleOk = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(ws);
      };
      const settleErr = (err: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      ws.on("message", (raw: WebSocket.RawData) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        switch (msg.type) {
          case "auth_required":
            ws.send(JSON.stringify({ type: "auth", access_token: this.cfg.token }));
            return;
          case "auth_ok":
            this.authed = true;
            this.ws = ws;
            settleOk();
            return;
          case "auth_invalid":
            settleErr(new Error(`Home-Assistant-WebSocket-Auth fehlgeschlagen: ${msg.message ?? "auth_invalid"}`));
            ws.close();
            return;
          default:
            break;
        }

        if (typeof msg.id === "number") {
          const p = this.pending.get(msg.id);
          if (!p) return;
          this.pending.delete(msg.id);
          if (msg.type === "result") {
            if (msg.success === false) {
              const code = msg.error?.code ?? "unknown_error";
              const message = msg.error?.message ?? "Unbekannter Fehler";
              p.reject(new Error(`HA-WebSocket-Fehler [${code}]: ${message}`));
            } else {
              p.resolve(msg.result);
            }
          } else {
            p.resolve(msg);
          }
        }
      });

      ws.on("error", settleErr);

      ws.on("close", () => {
        this.authed = false;
        this.ws = undefined;
        this.connecting = undefined;
        for (const [id, p] of this.pending) {
          p.reject(new Error("Home-Assistant-WebSocket-Verbindung wurde geschlossen"));
          this.pending.delete(id);
        }
        if (!settled) settleErr(new Error("Home-Assistant-WebSocket-Verbindung wurde vor Auth geschlossen"));
      });
    }).finally(() => {
      this.connecting = undefined;
    });

    return this.connecting;
  }

  /**
   * Sendet einen WS-Befehl (z.B. `config/area_registry/list`) und wartet auf
   * das Ergebnis. Reicht alle zusätzlichen Felder 1:1 in die Nachricht durch.
   */
  async command<T = unknown>(type: string, extra: Record<string, unknown> = {}, timeoutMs = 20000): Promise<T> {
    const ws = await this.connect();
    const id = this.msgId++;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`HA-WS-Befehl '${type}' hat nach ${timeoutMs}ms nicht geantwortet`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });

      ws.send(JSON.stringify({ id, type, ...extra }));
    });
  }

  close() {
    this.ws?.close();
  }
}
