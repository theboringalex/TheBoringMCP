import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HomeAssistantConfig } from "../config.js";
import type { HomeAssistantWsClient } from "../clients/homeassistant-ws.js";
import { request } from "../clients/http.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

type FlowType = "config" | "options";

/**
 * Config-/Options-Flows und generischer WS-Passthrough.
 *
 * Flow-Helper (group, template, min_max, ...) und Integrationen (z.B. Better
 * Thermostat) sind Config-Entries und lassen sich nur über den Config-Flow
 * anlegen – dafür gab es bisher kein Tool.
 */
export function registerHomeAssistantFlowTools(
  server: McpServer,
  cfg: HomeAssistantConfig,
  readOnly: boolean,
  ws: HomeAssistantWsClient,
) {
  const call = <T = Record<string, any>>(path: string, method: "GET" | "POST" | "DELETE" = "GET", body?: unknown) =>
    request<T>(cfg.baseUrl, `/api/config${path}`, {
      method,
      body,
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
  const base = (t: FlowType) => (t === "config" ? "/config_entries/flow" : "/config_entries/options/flow");

  server.tool(
    "ha_config_flow",
    "Config-Flow (neue Integration/Flow-Helper, z.B. group, template, min_max, better_thermostat) oder Options-Flow (bestehenden Eintrag ändern) durchlaufen. " +
      "action='run': startet den Flow (flow_type + handler) und sendet nacheinander alle 'steps' (jeweils user_input). Ohne steps wird nur gestartet und der erste Schritt (inkl. data_schema/Menü) zurückgegeben. " +
      "Menü-Schritte: user_input = { next_step_id: '...' }. Ergebnis: letzter Flow-Status (type=form → weiterer Schritt nötig, create_entry → fertig, abort). " +
      "action='step': weiteren Schritt an laufenden flow_id senden; action='get': aktuellen Schritt lesen; action='abort': Flow abbrechen. " +
      "Bei Options-Flows ist handler die entry_id.",
    {
      action: z.enum(["run", "step", "get", "abort"]),
      flow_type: z.enum(["config", "options"]),
      handler: z.string().optional().describe("run: Domain (config) bzw. entry_id (options)"),
      flow_id: z.string().optional().describe("step/get/abort: ID des laufenden Flows"),
      steps: z.array(z.record(z.unknown())).optional().describe("run: Liste von user_input-Objekten, der Reihe nach gesendet"),
      user_input: z.record(z.unknown()).optional().describe("step: user_input des Schritts"),
    },
    async ({ action, flow_type, handler, flow_id, steps, user_input }) => {
      if (action !== "get" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        const b = base(flow_type);
        if (action !== "run" && !flow_id) return fail(`action='${action}' braucht 'flow_id'.`);
        if (action === "get") return ok(await call(`${b}/${encodeURIComponent(flow_id!)}`));
        if (action === "abort") return ok(await call(`${b}/${encodeURIComponent(flow_id!)}`, "DELETE"));
        if (action === "step") return ok(await call(`${b}/${encodeURIComponent(flow_id!)}`, "POST", user_input ?? {}));
        if (!handler) return fail("action='run' braucht 'handler'.");
        let result = await call(b, "POST", flow_type === "config" ? { handler, show_advanced_options: true } : { handler });
        for (const input of steps ?? []) {
          if (result.type !== "form" && result.type !== "menu") break;
          try {
            result = await call(`${b}/${encodeURIComponent(result.flow_id)}`, "POST", input);
          } catch (e) {
            try { await call(`${b}/${encodeURIComponent(result.flow_id)}`, "DELETE"); } catch { /* ignorieren */ }
            throw e;
          }
        }
        return ok(result);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_ws_command",
    "Beliebigen Home-Assistant-WebSocket-Befehl absetzen (z.B. 'config_entries/get', 'config/entity_registry/list', 'hacs/info'). 'extra' wird 1:1 in die Nachricht übernommen. " +
      "Mächtig: nur im Nicht-READ_ONLY-Modus verfügbar, da beliebige Schreibbefehle möglich sind.",
    {
      type: z.string().describe("WS-Befehlstyp, z.B. 'config_entries/get'"),
      extra: z.record(z.unknown()).optional().describe("Zusätzliche Felder der Nachricht"),
    },
    async ({ type, extra }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await ws.command(type, extra ?? {}));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
