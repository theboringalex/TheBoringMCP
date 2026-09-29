import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HomeAssistantClient } from "../clients/homeassistant.js";
import type { HomeAssistantWsClient } from "../clients/homeassistant-ws.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

/** Helper-Typen, die als einfache "Storage Collections" über die WS-API laufen (`<typ>/list|create|update|delete`). */
const SIMPLE_HELPER_TYPES = [
  "input_button",
  "input_boolean",
  "input_select",
  "input_number",
  "input_text",
  "input_datetime",
  "counter",
  "timer",
  "schedule",
  "zone",
  "person",
  "tag",
] as const;

/** Einfache Aktion -> Service-Name je Domain, für `ha_bulk_control`. `null` = Domain nicht unterstützt. */
const BULK_ACTION_SERVICE: Record<string, Record<string, string>> = {
  default: { on: "turn_on", off: "turn_off", toggle: "toggle" },
  cover: { on: "open_cover", off: "close_cover", open: "open_cover", close: "close_cover", stop: "stop_cover", toggle: "toggle" },
  lock: { on: "lock", off: "unlock", lock: "lock", unlock: "unlock" },
  vacuum: { on: "start", off: "stop", start: "start", stop: "stop", pause: "pause", toggle: "toggle" },
  climate: { on: "turn_on", off: "turn_off" },
  media_player: { on: "turn_on", off: "turn_off", toggle: "toggle", pause: "media_pause", stop: "media_stop", play: "media_play" },
};

function resolveBulkService(entityId: string, action: string): { domain: string; service: string } {
  if (action.includes(".")) {
    const [domain, service] = action.split(".", 2);
    return { domain, service };
  }
  const domain = entityId.split(".", 1)[0];
  const service = (BULK_ACTION_SERVICE[domain] ?? BULK_ACTION_SERVICE.default)[action] ?? BULK_ACTION_SERVICE.default[action];
  if (!service) throw new Error(`Unbekannte Aktion '${action}' für Domain '${domain}' – nutze 'domain.service' explizit.`);
  return { domain, service };
}

/**
 * Registriert alle Home-Assistant-Tools. `readOnly=true` blendet
 * schreibende Tools aus (nur zur Vorsicht – standardmäßig voller Zugriff,
 * wie vom Nutzer gefordert).
 *
 * `ws` ist optional: Ohne WebSocket-Client (z.B. falls der Verbindungsaufbau
 * fehlschlägt) werden nur die REST-basierten Tools registriert; alle
 * Registry-/Storage-Tools (Areas, Helper, Dashboards, ...) brauchen ihn und
 * geben sonst einen klaren Fehler zurück statt eines kryptischen Absturzes.
 */
export function registerHomeAssistantTools(
  server: McpServer,
  client: HomeAssistantClient,
  readOnly: boolean,
  ws?: HomeAssistantWsClient,
) {
  function requireWs(): HomeAssistantWsClient {
    if (!ws) throw new Error("Kein Home-Assistant-WebSocket-Client verfügbar (Verbindungsaufbau fehlgeschlagen?).");
    return ws;
  }

  server.tool("ha_get_overview", "Home Assistant: Config/Version-Übersicht abrufen.", {}, async () => {
    try {
      return ok(await client.getConfig());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_list_states",
    "Alle aktuellen Entity-States aus Home Assistant abrufen (optional nach Domain gefiltert, z.B. 'light', 'sensor').",
    { domain: z.string().optional().describe("Nur Entities dieser Domain zurückgeben, z.B. 'light' oder 'switch'") },
    async ({ domain }) => {
      try {
        const states = await client.getStates();
        const filtered = domain
          ? states.filter((s) => String((s as { entity_id?: string }).entity_id ?? "").startsWith(`${domain}.`))
          : states;
        return ok(filtered);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_get_state",
    "Den aktuellen Zustand einer einzelnen Entity abrufen.",
    { entity_id: z.string().describe("z.B. 'light.wohnzimmer'") },
    async ({ entity_id }) => {
      try {
        return ok(await client.getState(entity_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_call_service",
    "Einen beliebigen Home-Assistant-Service aufrufen (z.B. light.turn_on, automation.trigger, climate.set_temperature). Voller Zugriff auf alle Domains/Services.",
    {
      domain: z.string().describe("z.B. 'light', 'switch', 'climate', 'automation'"),
      service: z.string().describe("z.B. 'turn_on', 'turn_off', 'trigger', 'set_temperature'"),
      target_entity_id: z.union([z.string(), z.array(z.string())]).optional().describe("Ziel-Entity(s)"),
      area_id: z.union([z.string(), z.array(z.string())]).optional(),
      device_id: z.union([z.string(), z.array(z.string())]).optional(),
      service_data: z.record(z.unknown()).optional().describe("Zusätzliche Service-Parameter, z.B. { brightness_pct: 50 }"),
    },
    async ({ domain, service, target_entity_id, area_id, device_id, service_data }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus – Service-Aufrufe sind deaktiviert.");
      try {
        const target: Record<string, unknown> = {};
        if (target_entity_id) target.entity_id = target_entity_id;
        if (area_id) target.area_id = area_id;
        if (device_id) target.device_id = device_id;
        return ok(await client.callService(domain, service, service_data, Object.keys(target).length ? target : undefined));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_set_state",
    "Setzt den State/Attribute einer Entity direkt (z.B. für input_*-Helper oder Test-Sensoren). Umgeht die Integration, wirkt nicht auf echte Geräte.",
    {
      entity_id: z.string(),
      state: z.string(),
      attributes: z.record(z.unknown()).optional(),
    },
    async ({ entity_id, state, attributes }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.setState(entity_id, state, attributes));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_list_services", "Alle verfügbaren Home-Assistant-Domains/Services auflisten.", {}, async () => {
    try {
      return ok(await client.getServices());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_get_history",
    "Verlauf (History) für ein oder mehrere Entities abrufen.",
    {
      entity_ids: z.array(z.string()),
      start_time: z.string().optional().describe("ISO-8601, z.B. 2026-09-01T00:00:00Z"),
      end_time: z.string().optional(),
    },
    async ({ entity_ids, start_time, end_time }) => {
      try {
        return ok(await client.getHistory(entity_ids, start_time, end_time));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_get_logbook",
    "Logbuch-Einträge abrufen (was ist wann passiert).",
    { start_time: z.string().optional(), end_time: z.string().optional(), entity_id: z.string().optional() },
    async ({ start_time, end_time, entity_id }) => {
      try {
        return ok(await client.getLogbook(start_time, end_time, entity_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_get_error_log", "Den aktuellen Home-Assistant-Fehlerlog abrufen.", {}, async () => {
    try {
      return ok(await client.getErrorLog());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_render_template",
    "Einen Jinja2-Template-String in Home Assistant auswerten lassen (nützlich zum Testen von Templates vor dem Einbau in Automationen).",
    { template: z.string() },
    async ({ template }) => {
      try {
        return ok(await client.renderTemplate(template));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Automationen -------------------------------------------------------
  server.tool("ha_list_automations", "Alle konfigurierten Automationen auflisten.", {}, async () => {
    try {
      return ok(await client.listAutomationConfigs());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_get_automation",
    "Konfiguration einer einzelnen Automation abrufen.",
    { automation_id: z.string() },
    async ({ automation_id }) => {
      try {
        return ok(await client.getAutomationConfig(automation_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_set_automation",
    "Eine Automation anlegen oder überschreiben (vollständige Automation-Konfiguration als JSON, wie in der UI-YAML).",
    { automation_id: z.string().describe("Neue oder bestehende ID, z.B. Zeitstempel oder sprechender Name"), config: z.record(z.unknown()) },
    async ({ automation_id, config }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.setAutomationConfig(automation_id, config));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_delete_automation",
    "Eine Automation löschen.",
    { automation_id: z.string() },
    async ({ automation_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.deleteAutomationConfig(automation_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Skripte --------------------------------------------------------------
  server.tool("ha_get_script", "Konfiguration eines Skripts abrufen.", { script_id: z.string() }, async ({ script_id }) => {
    try {
      return ok(await client.getScriptConfig(script_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_set_script",
    "Ein Skript anlegen oder überschreiben.",
    { script_id: z.string(), config: z.record(z.unknown()) },
    async ({ script_id, config }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.setScriptConfig(script_id, config));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_delete_script", "Ein Skript löschen.", { script_id: z.string() }, async ({ script_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteScriptConfig(script_id));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Szenen -----------------------------------------------------------------
  server.tool("ha_get_scene", "Konfiguration einer Szene abrufen.", { scene_id: z.string() }, async ({ scene_id }) => {
    try {
      return ok(await client.getSceneConfig(scene_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_set_scene",
    "Eine Szene anlegen oder überschreiben.",
    { scene_id: z.string(), config: z.record(z.unknown()) },
    async ({ scene_id, config }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.setSceneConfig(scene_id, config));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_delete_scene", "Eine Szene löschen.", { scene_id: z.string() }, async ({ scene_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.deleteSceneConfig(scene_id));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Core-Steuerung -----------------------------------------------------------
  server.tool("ha_check_config", "Home-Assistant-Konfiguration auf Fehler prüfen (ohne neu zu starten).", {}, async () => {
    try {
      return ok(await client.checkConfig());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("ha_restart", "Home Assistant Core neu starten.", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.restartCore());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("ha_reload_core_config", "Nur die Core-Konfiguration neu laden (kein voller Neustart).", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.reloadCoreConfig());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("ha_reload_all", "Alle YAML-Konfigurationen neu laden (Automationen, Skripte, Szenen, Gruppen, ...).", {}, async () => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.reloadAll());
    } catch (e) {
      return fail(e);
    }
  });

  // ===========================================================================
  // Ab hier: Erweiterung auf Berechtigungsparität mit dem Referenzprojekt
  // homeassistant-ai/ha-mcp. Alles unterhalb braucht den WebSocket-Client
  // (`requireWs()`), weil HA diese Registries/Storage-Collections nicht über
  // die REST-API anbietet. Tools mit einem "(best effort)"-Hinweis nutzen
  // WS-Befehle, die nicht Teil der offiziell stabilen REST-API sind bzw. von
  // optionalen Integrationen (HACS, ZHA, Z-Wave JS) abhängen – vor
  // produktivem Einsatz einmal gegen die eigene HA-Version testen.
  // ===========================================================================

  // --- Suche ------------------------------------------------------------------
  server.tool(
    "ha_search",
    "Fuzzy-Suche über Entities (entity_id/friendly_name), optional nach Domain gefiltert. Für 'wie heißt die Entity nochmal' statt exaktem entity_id.",
    {
      query: z.string().describe("Suchbegriff, z.B. 'wohnzimmer lampe'"),
      domain_filter: z.string().optional().describe("Nur diese Domain durchsuchen, z.B. 'light'"),
      limit: z.number().int().positive().max(200).optional(),
    },
    async ({ query, domain_filter, limit }) => {
      try {
        const states = await client.getStates();
        const q = query.toLowerCase().split(/\s+/).filter(Boolean);
        const scored = states
          .map((s) => {
            const entityId = String((s as any).entity_id ?? "");
            const name = String((s as any).attributes?.friendly_name ?? "");
            if (domain_filter && !entityId.startsWith(`${domain_filter}.`)) return null;
            const haystack = `${entityId} ${name}`.toLowerCase();
            const score = q.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
            return score > 0 ? { entity_id: entityId, friendly_name: name, state: (s as any).state, score } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit ?? 30);
        return ok(scored);
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Entity-Registry ----------------------------------------------------------
  server.tool("ha_get_entity", "Vollständigen Entity-Registry-Eintrag abrufen (Device, Area, Kategorien, disabled/hidden, ...).", { entity_id: z.string() }, async ({ entity_id }) => {
    try {
      return ok(await requireWs().command("config/entity_registry/get", { entity_id }));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_set_entity",
    "Entity-Registry-Eintrag ändern: Name, Icon, Area, Labels, Kategorien, sichtbar/aktiviert, neue entity_id.",
    {
      entity_id: z.string(),
      name: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
      area_id: z.string().nullable().optional(),
      new_entity_id: z.string().optional().describe("Umbenennen (neue entity_id)"),
      disabled_by: z.enum(["user"]).nullable().optional().describe("'user' zum Deaktivieren, null zum Aktivieren"),
      hidden_by: z.enum(["user"]).nullable().optional(),
      labels: z.array(z.string()).optional(),
      categories: z.record(z.string()).optional().describe("z.B. { automation: 'kategorie_id' }"),
    },
    async ({ entity_id, new_entity_id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        const payload: Record<string, unknown> = { entity_id, ...rest };
        if (new_entity_id) payload.new_entity_id = new_entity_id;
        return ok(await requireWs().command("config/entity_registry/update", payload));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_remove_entity", "Entity-Registry-Eintrag löschen (nur der Registry-Eintrag, nicht das echte Gerät).", { entity_id: z.string() }, async ({ entity_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await requireWs().command("config/entity_registry/remove", { entity_id }));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_get_entity_exposure",
    "Zeigt, für welche Voice-Assistants (Assist/Alexa/Google) eine Entity freigegeben ('exposed') ist (best effort, liest aus den Entity-Registry-Options).",
    { entity_id: z.string() },
    async ({ entity_id }) => {
      try {
        const entry = await requireWs().command<Record<string, unknown>>("config/entity_registry/get", { entity_id });
        const options = (entry as any).options ?? {};
        return ok({
          entity_id,
          conversation: options.conversation ?? null,
          cloud_alexa: options["cloud.alexa"] ?? null,
          cloud_google_assistant: options["cloud.google_assistant"] ?? null,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Device-Registry ----------------------------------------------------------
  server.tool(
    "ha_get_device",
    "Geräte-Registry-Einträge abrufen (alle, oder gefiltert auf eine device_id).",
    { device_id: z.string().optional() },
    async ({ device_id }) => {
      try {
        const devices = await requireWs().command<Array<Record<string, unknown>>>("config/device_registry/list");
        if (!device_id) return ok(devices);
        const found = devices.find((d) => d.id === device_id);
        return found ? ok(found) : fail(`Gerät '${device_id}' nicht gefunden.`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_set_device",
    "Geräte-Registry-Eintrag ändern: benutzerdefinierter Name, Area, Labels, aktiviert/deaktiviert.",
    {
      device_id: z.string(),
      name_by_user: z.string().nullable().optional(),
      area_id: z.string().nullable().optional(),
      disabled_by: z.enum(["user"]).nullable().optional(),
      labels: z.array(z.string()).optional(),
    },
    async ({ device_id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await requireWs().command("config/device_registry/update", { device_id, ...rest }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_remove_device",
    "Gerät entfernen (entfernt den zugehörigen Config-Entry vom Gerät; löscht das Gerät, wenn es dessen letzter war). config_entry_id optional – wird sonst automatisch aus dem Geräteeintrag ermittelt (erster Eintrag).",
    { device_id: z.string(), config_entry_id: z.string().optional() },
    async ({ device_id, config_entry_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        let entryId = config_entry_id;
        if (!entryId) {
          const devices = await requireWs().command<Array<Record<string, unknown>>>("config/device_registry/list");
          const dev = devices.find((d) => d.id === device_id);
          entryId = (dev?.config_entries as string[] | undefined)?.[0];
          if (!entryId) return fail(`Konnte keinen config_entry_id für Gerät '${device_id}' ermitteln – bitte explizit angeben.`);
        }
        return ok(await requireWs().command("config/device_registry/remove_config_entry", { device_id, config_entry_id: entryId }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Areas & Floors -------------------------------------------------------------
  server.tool("ha_list_floors_areas", "Alle Areas und Floors (Stockwerke) auflisten.", {}, async () => {
    try {
      const [areas, floors] = await Promise.all([
        requireWs().command("config/area_registry/list"),
        requireWs().command("config/floor_registry/list"),
      ]);
      return ok({ areas, floors });
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_set_area_or_floor",
    "Area oder Floor anlegen (kind ohne id) oder ändern (kind + id).",
    {
      kind: z.enum(["area", "floor"]),
      id: z.string().optional().describe("area_id bzw. floor_id – weglassen zum Neuanlegen"),
      name: z.string().optional(),
      icon: z.string().nullable().optional(),
      picture: z.string().nullable().optional().describe("Nur Areas: Bild-URL"),
      floor_id: z.string().nullable().optional().describe("Nur Areas: zugehöriges Stockwerk"),
      level: z.number().nullable().optional().describe("Nur Floors: Ebene, z.B. 0 = EG, 1 = OG"),
      aliases: z.array(z.string()).optional(),
      labels: z.array(z.string()).optional(),
    },
    async ({ kind, id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        const prefix = kind === "area" ? "config/area_registry" : "config/floor_registry";
        const idField = kind === "area" ? "area_id" : "floor_id";
        if (id) {
          return ok(await requireWs().command(`${prefix}/update`, { [idField]: id, ...rest }));
        }
        return ok(await requireWs().command(`${prefix}/create`, rest));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_remove_area_or_floor",
    "Area oder Floor löschen.",
    { kind: z.enum(["area", "floor"]), id: z.string() },
    async ({ kind, id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        const prefix = kind === "area" ? "config/area_registry" : "config/floor_registry";
        const idField = kind === "area" ? "area_id" : "floor_id";
        return ok(await requireWs().command(`${prefix}/delete`, { [idField]: id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Zonen ------------------------------------------------------------------------
  server.tool("ha_get_zone", "Zonen (Geo-Bereiche für Anwesenheitserkennung) abrufen, optional nach zone_id gefiltert.", { zone_id: z.string().optional() }, async ({ zone_id }) => {
    try {
      const zones = await requireWs().command<Array<Record<string, unknown>>>("zone/list");
      if (!zone_id) return ok(zones);
      const found = zones.find((z2) => z2.id === zone_id);
      return found ? ok(found) : fail(`Zone '${zone_id}' nicht gefunden.`);
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_set_zone",
    "Zone anlegen (ohne zone_id) oder ändern (mit zone_id).",
    {
      zone_id: z.string().optional(),
      name: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radius: z.number().optional(),
      icon: z.string().optional(),
      passive: z.boolean().optional(),
    },
    async ({ zone_id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (zone_id) return ok(await requireWs().command("zone/update", { zone_id, ...rest }));
        return ok(await requireWs().command("zone/create", rest));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_remove_zone", "Zone löschen.", { zone_id: z.string() }, async ({ zone_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await requireWs().command("zone/delete", { zone_id }));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Helper (input_*, counter, timer, schedule, person, tag) + Flow-Helper/Integrationen --
  server.tool(
    "ha_config_list_helpers",
    "Helper eines Typs auflisten (input_boolean, input_number, counter, timer, schedule, zone, person, tag, ...), oder 'all' für alle Storage-Helper-Typen auf einmal.",
    { helper_type: z.enum([...SIMPLE_HELPER_TYPES, "all"]) },
    async ({ helper_type }) => {
      try {
        if (helper_type === "all") {
          const entries = await Promise.all(
            SIMPLE_HELPER_TYPES.map(async (t) => [t, await requireWs().command(`${t}/list`)] as const),
          );
          return ok(Object.fromEntries(entries));
        }
        return ok(await requireWs().command(`${helper_type}/list`));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_config_set_helper",
    "Helper anlegen (ohne id) oder ändern (mit id). config = die typspezifischen Felder (z.B. bei input_number: min/max/step/initial).",
    {
      helper_type: z.enum(SIMPLE_HELPER_TYPES),
      id: z.string().optional().describe("Bestehende Helper-ID zum Ändern, weglassen zum Neuanlegen"),
      config: z.record(z.unknown()).describe("z.B. { name: 'Urlaubsmodus', icon: 'mdi:beach' }"),
    },
    async ({ helper_type, id, config }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (id) {
          return ok(await requireWs().command(`${helper_type}/update`, { [`${helper_type}_id`]: id, ...config }));
        }
        return ok(await requireWs().command(`${helper_type}/create`, config));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_remove_helpers_integrations",
    "Löscht entweder einen einfachen Helper (helper_type gesetzt, id = Helper-ID) oder eine ganze Integration/einen Flow-Helper (helper_type weglassen, id = config_entry_id – z.B. für template/group/utility_meter-Helper, die als Integration angelegt sind).",
    { helper_type: z.enum(SIMPLE_HELPER_TYPES).optional(), id: z.string() },
    async ({ helper_type, id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (helper_type) {
          return ok(await requireWs().command(`${helper_type}/delete`, { [`${helper_type}_id`]: id }));
        }
        // Flow-basierter Helper oder normale Integration -> ist ein Config-Entry.
        return ok(await client.deleteConfigEntry(id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Gruppen (legacy, group.set/group.remove) --------------------------------------
  server.tool("ha_config_list_groups", "Alle Legacy-Gruppen (group.*-Entities) auflisten.", {}, async () => {
    try {
      const states = await client.getStates();
      return ok(states.filter((s) => String((s as any).entity_id ?? "").startsWith("group.")));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_config_set_group",
    "Legacy-Gruppe anlegen/überschreiben (group.set).",
    {
      object_id: z.string().describe("z.B. 'wohnzimmer_lichter' -> group.wohnzimmer_lichter"),
      entities: z.array(z.string()),
      name: z.string().optional(),
      icon: z.string().optional(),
      all: z.boolean().optional().describe("true = 'an' nur wenn ALLE Mitglieder an sind"),
    },
    async ({ object_id, entities, name, icon, all }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.callService("group", "set", { object_id, entities, name, icon, all }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_config_remove_group", "Legacy-Gruppe löschen (group.remove).", { object_id: z.string() }, async ({ object_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.callService("group", "remove", { object_id }));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Labels & Categories -------------------------------------------------------------
  server.tool("ha_config_get_label", "Label(s) abrufen (alle, oder eins per label_id).", { label_id: z.string().optional() }, async ({ label_id }) => {
    try {
      const labels = await requireWs().command<Array<Record<string, unknown>>>("config/label_registry/list");
      if (!label_id) return ok(labels);
      const found = labels.find((l) => l.label_id === label_id);
      return found ? ok(found) : fail(`Label '${label_id}' nicht gefunden.`);
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_config_set_label",
    "Label anlegen (ohne label_id) oder ändern (mit label_id).",
    { label_id: z.string().optional(), name: z.string().optional(), icon: z.string().nullable().optional(), color: z.string().nullable().optional(), description: z.string().nullable().optional() },
    async ({ label_id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (label_id) return ok(await requireWs().command("config/label_registry/update", { label_id, ...rest }));
        return ok(await requireWs().command("config/label_registry/create", rest));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_config_remove_label", "Label löschen.", { label_id: z.string() }, async ({ label_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await requireWs().command("config/label_registry/delete", { label_id }));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_config_get_category",
    "Kategorien für einen Scope (z.B. 'automation', 'script', 'scene', 'helpers') abrufen, alle oder eine per category_id.",
    { scope: z.string(), category_id: z.string().optional() },
    async ({ scope, category_id }) => {
      try {
        const cats = await requireWs().command<Array<Record<string, unknown>>>("config/category_registry/list", { scope });
        if (!category_id) return ok(cats);
        const found = cats.find((c) => c.category_id === category_id);
        return found ? ok(found) : fail(`Kategorie '${category_id}' in Scope '${scope}' nicht gefunden.`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_config_set_category",
    "Kategorie in einem Scope anlegen (ohne category_id) oder ändern (mit category_id).",
    { scope: z.string(), category_id: z.string().optional(), name: z.string().optional(), icon: z.string().nullable().optional() },
    async ({ scope, category_id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (category_id) return ok(await requireWs().command("config/category_registry/update", { scope, category_id, ...rest }));
        return ok(await requireWs().command("config/category_registry/create", { scope, ...rest }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_config_remove_category", "Kategorie aus einem Scope löschen.", { scope: z.string(), category_id: z.string() }, async ({ scope, category_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await requireWs().command("config/category_registry/delete", { scope, category_id }));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Dashboards (Lovelace) -----------------------------------------------------------
  server.tool(
    "ha_config_get_dashboard",
    "Dashboards auflisten (list_only) oder ein Dashboard-Config abrufen (url_path weglassen = Standard-Dashboard).",
    { list_only: z.boolean().optional(), url_path: z.string().optional() },
    async ({ list_only, url_path }) => {
      try {
        if (list_only) return ok(await requireWs().command("lovelace/dashboards/list"));
        return ok(await requireWs().command("lovelace/config", url_path ? { url_path } : {}));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_config_set_dashboard",
    "Dashboard-Metadaten (mode='metadata': Titel/Icon/Sidebar) ODER den eigentlichen View-/Karten-Inhalt (mode='content': volle Lovelace-config) anlegen/ändern.",
    {
      mode: z.enum(["metadata", "content"]),
      url_path: z.string().describe("Für neue Dashboards frei wählbar, z.B. 'lovelace-mobile'"),
      title: z.string().optional().describe("Nur mode='metadata'"),
      icon: z.string().optional().describe("Nur mode='metadata'"),
      show_in_sidebar: z.boolean().optional().describe("Nur mode='metadata'"),
      require_admin: z.boolean().optional().describe("Nur mode='metadata'"),
      is_new: z.boolean().optional().describe("Nur mode='metadata': true = neu anlegen statt ändern"),
      config: z.record(z.unknown()).optional().describe("Nur mode='content': volle Lovelace-Config { views: [...] }"),
    },
    async ({ mode, url_path, is_new, config, ...meta }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (mode === "content") {
          if (!config) return fail("mode='content' braucht 'config'.");
          return ok(await requireWs().command("lovelace/config/save", { url_path, config }));
        }
        if (is_new) return ok(await requireWs().command("lovelace/dashboards/create", { url_path, ...meta }));
        return ok(await requireWs().command("lovelace/dashboards/update", { dashboard_id: url_path, ...meta }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_config_delete_dashboard", "Dashboard vollständig löschen (nicht für YAML-Mode-Dashboards).", { url_path: z.string() }, async ({ url_path }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await requireWs().command("lovelace/dashboards/delete", { dashboard_id: url_path }));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("ha_config_list_dashboard_resources", "Registrierte Lovelace-Resources (Custom Cards, Themes, CSS/JS) auflisten.", {}, async () => {
    try {
      return ok(await requireWs().command("lovelace/resources/list"));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_config_set_dashboard_resource",
    "Dashboard-Resource anlegen (ohne resource_id) oder ändern (mit resource_id).",
    { resource_id: z.string().optional(), url: z.string(), res_type: z.enum(["module", "css", "html", "js"]).optional() },
    async ({ resource_id, url, res_type }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        const type = res_type ?? "module";
        if (resource_id) return ok(await requireWs().command("lovelace/resources/update", { resource_id, url, res_type: type }));
        return ok(await requireWs().command("lovelace/resources/create", { url, res_type: type }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_config_delete_dashboard_resource", "Dashboard-Resource löschen.", { resource_id: z.string() }, async ({ resource_id }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await requireWs().command("lovelace/resources/delete", { resource_id }));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Automation-Traces --------------------------------------------------------------
  server.tool(
    "ha_get_automation_traces",
    "Ausführungs-Traces einer Automation/eines Skripts abrufen (Liste, oder ein einzelner Run mit run_id).",
    { domain: z.enum(["automation", "script"]).default("automation"), item_id: z.string(), run_id: z.string().optional() },
    async ({ domain, item_id, run_id }) => {
      try {
        if (run_id) return ok(await requireWs().command("trace/get", { domain, item_id, run_id }));
        return ok(await requireWs().command("trace/list", { domain, item_id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- System / Diagnose ---------------------------------------------------------------
  server.tool("ha_get_system_health", "System-Health-Info aller Integrationen abrufen (wie Einstellungen -> System -> Repariere/Health).", {}, async () => {
    try {
      return ok(await requireWs().command("system_health/info", {}, 30000));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("ha_get_logs", "Strukturiertes System-Log abrufen (im Gegensatz zu ha_get_error_log: als Liste einzelner Einträge mit Level/Quelle).", {}, async () => {
    try {
      return ok(await requireWs().command("system_log/list"));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Config-Entries / Integrationen ----------------------------------------------------
  server.tool(
    "ha_get_integration",
    "Konfigurierte Integrationen (Config-Entries) abrufen, optional nach Domain gefiltert oder eine per entry_id.",
    { domain: z.string().optional(), entry_id: z.string().optional() },
    async ({ domain, entry_id }) => {
      try {
        const entries = await client.listConfigEntries();
        if (entry_id) {
          const found = entries.find((e: any) => e.entry_id === entry_id);
          return found ? ok(found) : fail(`Config-Entry '${entry_id}' nicht gefunden.`);
        }
        return ok(domain ? entries.filter((e: any) => e.domain === domain) : entries);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_set_integration",
    "Integration (Config-Entry) ändern: Titel umbenennen und/oder aktivieren/deaktivieren (best effort – WS-Befehlsnamen können je HA-Version leicht abweichen).",
    { entry_id: z.string(), title: z.string().optional(), disabled: z.boolean().optional() },
    async ({ entry_id, title, disabled }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        const results: Record<string, unknown> = {};
        if (title !== undefined) results.update = await requireWs().command("config_entries/update", { entry_id, title });
        if (disabled !== undefined) {
          results.disable = await requireWs().command("config_entries/disable", { entry_id, disabled_by: disabled ? "user" : null });
        }
        return ok(results);
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Energie -------------------------------------------------------------------------
  server.tool(
    "ha_manage_energy_prefs",
    "Energie-Dashboard-Einstellungen abrufen (action='get') oder speichern (action='save', prefs=volle Preferences).",
    { action: z.enum(["get", "save"]), prefs: z.record(z.unknown()).optional() },
    async ({ action, prefs }) => {
      if (action === "save" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (action === "get") return ok(await requireWs().command("energy/get_prefs"));
        if (!prefs) return fail("action='save' braucht 'prefs'.");
        return ok(await requireWs().command("energy/save_prefs", prefs));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Assist-Pipelines ------------------------------------------------------------------
  server.tool(
    "ha_manage_pipeline",
    "Assist-Pipelines verwalten: list/create/update/delete/set_preferred.",
    {
      action: z.enum(["list", "create", "update", "delete", "set_preferred"]),
      pipeline_id: z.string().optional(),
      config: z.record(z.unknown()).optional().describe("Für create/update: name, conversation_engine, stt_engine, tts_engine, ..."),
    },
    async ({ action, pipeline_id, config }) => {
      if (action !== "list" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (action === "list") return ok(await requireWs().command("assist_pipeline/pipeline/list"));
        if (action === "create") return ok(await requireWs().command("assist_pipeline/pipeline/create", config ?? {}));
        if (!pipeline_id) return fail(`action='${action}' braucht 'pipeline_id'.`);
        if (action === "update") return ok(await requireWs().command("assist_pipeline/pipeline/update", { pipeline_id, ...(config ?? {}) }));
        if (action === "delete") return ok(await requireWs().command("assist_pipeline/pipeline/delete", { pipeline_id }));
        return ok(await requireWs().command("assist_pipeline/pipeline/set_preferred", { pipeline_id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Themes (best effort) ---------------------------------------------------------------
  server.tool(
    "ha_manage_theme",
    "Themes auflisten (action='list') oder ein Theme für den aktuellen Nutzer aktivieren (action='set', best effort).",
    { action: z.enum(["list", "set"]), theme_name: z.string().optional(), mode: z.enum(["light", "dark", "auto"]).optional() },
    async ({ action, theme_name, mode }) => {
      if (action === "set" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (action === "list") return ok(await requireWs().command("frontend/get_themes"));
        if (!theme_name) return fail("action='set' braucht 'theme_name'.");
        return ok(await requireWs().command("frontend/set_theme", { name: theme_name, mode: mode ?? "auto" }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Backups -------------------------------------------------------------------------
  server.tool(
    "ha_manage_backup",
    "Backups verwalten: info (Übersicht/Config), generate (neues Backup erstellen), details, delete.",
    { action: z.enum(["info", "generate", "details", "delete"]), backup_id: z.string().optional(), name: z.string().optional() },
    async ({ action, backup_id, name }) => {
      if (action !== "info" && action !== "details" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (action === "info") return ok(await requireWs().command("backup/info"));
        if (action === "generate") return ok(await requireWs().command("backup/generate", name ? { name } : {}, 300000));
        if (!backup_id) return fail(`action='${action}' braucht 'backup_id'.`);
        if (action === "details") return ok(await requireWs().command("backup/details", { backup_id }));
        return ok(await requireWs().command("backup/delete", { backup_id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Blueprints ----------------------------------------------------------------------
  server.tool(
    "ha_manage_blueprints",
    "Blueprints verwalten: list, import (per URL), save (YAML direkt speichern), delete.",
    {
      action: z.enum(["list", "import", "save", "delete"]),
      domain: z.enum(["automation", "script"]).default("automation"),
      url: z.string().optional().describe("Für action='import'"),
      path: z.string().optional().describe("Für save/delete, z.B. 'mein_ordner/blueprint.yaml'"),
      yaml: z.string().optional().describe("Für action='save': roher YAML-Inhalt"),
    },
    async ({ action, domain, url, path, yaml }) => {
      if (action !== "list" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (action === "list") return ok(await requireWs().command("blueprint/list", { domain }));
        if (action === "import") {
          if (!url) return fail("action='import' braucht 'url'.");
          return ok(await requireWs().command("blueprint/import", { url }));
        }
        if (!path) return fail(`action='${action}' braucht 'path'.`);
        if (action === "save") {
          if (!yaml) return fail("action='save' braucht 'yaml'.");
          return ok(await requireWs().command("blueprint/save", { domain, path, yaml, source_url: url }));
        }
        return ok(await requireWs().command("blueprint/delete", { domain, path }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- HACS (best effort – inoffizielle WS-API, versionsabhängig) -------------------------
  server.tool("ha_get_hacs_info", "HACS-Status/-Version abrufen (nur falls HACS installiert ist; inoffizielle API, best effort).", {}, async () => {
    try {
      return ok(await requireWs().command("hacs/config"));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_manage_hacs",
    "HACS-Repository verwalten: list, install, uninstall, update (nur falls HACS installiert ist; inoffizielle API, best effort – bei Fehlern HACS-Logs prüfen).",
    { action: z.enum(["list", "install", "uninstall", "update"]), repository: z.string().optional().describe("z.B. 'hacs/integration' oder Repo-ID") },
    async ({ action, repository }) => {
      if (action !== "list" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (action === "list") return ok(await requireWs().command("hacs/repositories/list"));
        if (!repository) return fail(`action='${action}' braucht 'repository'.`);
        return ok(await requireWs().command(`hacs/repository/${action}`, { repository }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Funk-Integrationen ZHA/Z-Wave JS (best effort, sehr installationsabhängig) -----------
  server.tool(
    "ha_manage_radio",
    "Zigbee (ZHA) oder Z-Wave (Z-Wave JS) Funk-Netzwerk abfragen/steuern – Befehle unterscheiden sich stark je Integration (best effort).",
    {
      integration: z.enum(["zha", "zwave_js"]),
      action: z.enum(["devices", "network_status", "permit_join"]),
      config_entry_id: z.string().optional().describe("Nur zwave_js: benötigt für network_status"),
      duration: z.number().int().optional().describe("Nur zha + permit_join: Sekunden, Standard 60"),
    },
    async ({ integration, action, config_entry_id, duration }) => {
      if (action === "permit_join" && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (integration === "zha") {
          if (action === "devices") return ok(await requireWs().command("zha/devices"));
          if (action === "permit_join") return ok(await requireWs().command("zha/permit", { duration: duration ?? 60 }));
          return fail("action='network_status' wird für 'zha' nicht unterstützt – nutze 'devices'.");
        }
        // zwave_js
        if (action === "network_status") return ok(await requireWs().command("zwave_js/network_status", config_entry_id ? { entry_id: config_entry_id } : {}));
        return fail(`action='${action}' wird für 'zwave_js' hier nicht unterstützt.`);
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Kamera --------------------------------------------------------------------------
  server.tool("ha_get_camera_image", "Aktuelles Kamerabild abrufen (REST camera_proxy).", { entity_id: z.string() }, async ({ entity_id }) => {
    try {
      const { contentType, base64 } = await client.getCameraImage(entity_id);
      return { content: [{ type: "image" as const, data: base64, mimeType: contentType }] };
    } catch (e) {
      return fail(e);
    }
  });

  // --- To-do-Listen ----------------------------------------------------------------------
  server.tool("ha_get_todo", "Einträge einer To-do-Liste abrufen.", { entity_id: z.string() }, async ({ entity_id }) => {
    try {
      return ok(await requireWs().command("todo/item/list", { entity_id }));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "ha_set_todo_item",
    "Neuen To-do-Eintrag anlegen (ohne uid) oder bestehenden ändern (mit uid).",
    {
      entity_id: z.string(),
      item: z.string().describe("Titel/Text des Eintrags"),
      uid: z.string().optional().describe("Bestehenden Eintrag ändern statt neu anlegen"),
      status: z.enum(["needs_action", "completed"]).optional(),
      description: z.string().optional(),
      due_date: z.string().optional(),
      due_datetime: z.string().optional(),
    },
    async ({ entity_id, item, uid, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        if (uid) return ok(await client.callService("todo", "update_item", { entity_id, item: uid, rename: item, ...rest }, { entity_id }));
        return ok(await client.callService("todo", "add_item", { item, ...rest }, { entity_id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("ha_remove_todo_item", "To-do-Eintrag löschen.", { entity_id: z.string(), item: z.string().describe("Titel oder uid des Eintrags") }, async ({ entity_id, item }) => {
    if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
    try {
      return ok(await client.callService("todo", "remove_item", { item: [item] }, { entity_id }));
    } catch (e) {
      return fail(e);
    }
  });

  // --- Kalender-Events -------------------------------------------------------------------
  server.tool(
    "ha_config_get_calendar_events",
    "Kalender-Events in einem Zeitraum abrufen.",
    { entity_id: z.string(), start: z.string().optional(), end: z.string().optional() },
    async ({ entity_id, start, end }) => {
      try {
        return ok(await client.getCalendarEvents(entity_id, start, end));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_config_set_calendar_event",
    "Neuen Kalender-Termin anlegen (calendar.create_event – nicht jede Kalender-Integration unterstützt das, z.B. 'Local Calendar' schon).",
    {
      entity_id: z.string(),
      summary: z.string(),
      start_date_time: z.string().optional(),
      end_date_time: z.string().optional(),
      start_date: z.string().optional().describe("Ganztägig: YYYY-MM-DD"),
      end_date: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
    },
    async ({ entity_id, ...rest }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.callService("calendar", "create_event", rest, { entity_id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_config_remove_calendar_event",
    "Kalender-Termin löschen (calendar.delete_event – wird nicht von jeder Kalender-Integration unterstützt, HA gibt dann einen Fehler zurück).",
    { entity_id: z.string(), uid: z.string() },
    async ({ entity_id, uid }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.callService("calendar", "delete_event", { uid }, { entity_id }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Events ----------------------------------------------------------------------------
  server.tool(
    "ha_call_event",
    "Ein beliebiges Event auf den HA-Event-Bus feuern (für event-getriggerte Automationen/Node-RED/eigene Integrationen). Fire-and-forget.",
    { event_type: z.string(), event_data: z.record(z.unknown()).optional() },
    async ({ event_type, event_data }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.fireEvent(event_type, event_data));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Bulk-Steuerung ----------------------------------------------------------------------
  server.tool(
    "ha_bulk_control",
    "Mehrere Entities in einem Aufruf steuern: entweder explizite 'operations' (je entity_id+action) oder ein 'selector' (domain + area_ids/floor_ids, max. 100 aufgelöste Entities). dry_run zeigt nur die aufgelösten Ziele ohne zu schalten.",
    {
      operations: z
        .array(z.object({ entity_id: z.string(), action: z.string().describe("z.B. 'on', 'off', 'toggle' oder 'domain.service'"), parameters: z.record(z.unknown()).optional() }))
        .optional(),
      selector: z
        .object({
          domain: z.string(),
          area_ids: z.array(z.string()).optional(),
          floor_ids: z.array(z.string()).optional(),
          exclude_entity_ids: z.array(z.string()).optional(),
        })
        .optional(),
      action: z.string().optional().describe("Nur mit 'selector': anzuwendende Aktion"),
      parameters: z.record(z.unknown()).optional().describe("Nur mit 'selector'"),
      dry_run: z.boolean().optional(),
    },
    async ({ operations, selector, action, parameters, dry_run }) => {
      if (!dry_run && readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        let targets: Array<{ entity_id: string; action: string; parameters?: Record<string, unknown> }>;

        if (operations) {
          targets = operations;
        } else if (selector) {
          if (!action) return fail("Mit 'selector' muss 'action' gesetzt sein.");
          const states = await client.getStates();
          let entityIds = states
            .map((s) => String((s as any).entity_id ?? ""))
            .filter((id) => id.startsWith(`${selector.domain}.`));

          if (selector.area_ids?.length || selector.floor_ids?.length) {
            const [entities, areas] = await Promise.all([
              requireWs().command<Array<Record<string, unknown>>>("config/entity_registry/list"),
              requireWs().command<Array<Record<string, unknown>>>("config/area_registry/list"),
            ]);
            const areaIdsFromFloors = selector.floor_ids?.length
              ? areas.filter((a) => selector.floor_ids!.includes(a.floor_id as string)).map((a) => a.area_id as string)
              : [];
            const allowedAreaIds = new Set([...(selector.area_ids ?? []), ...areaIdsFromFloors]);
            const allowedEntityIds = new Set(entities.filter((e) => allowedAreaIds.has(e.area_id as string)).map((e) => e.entity_id as string));
            entityIds = entityIds.filter((id) => allowedEntityIds.has(id));
          }

          if (selector.exclude_entity_ids?.length) {
            const excluded = new Set(selector.exclude_entity_ids);
            entityIds = entityIds.filter((id) => !excluded.has(id));
          }

          if (entityIds.length > 100) {
            return fail(`Selector löst auf ${entityIds.length} Entities auf (Max. 100) – bitte enger fassen (spezifischere Area/Floor oder exclude_entity_ids).`);
          }

          targets = entityIds.map((entity_id) => ({ entity_id, action, parameters }));
        } else {
          return fail("Entweder 'operations' oder 'selector' angeben.");
        }

        if (dry_run) return ok({ resolved_targets: targets.map((t) => t.entity_id) });

        const results = await Promise.allSettled(
          targets.map(async (t) => {
            const { domain, service } = resolveBulkService(t.entity_id, t.action);
            await client.callService(domain, service, t.parameters, { entity_id: t.entity_id });
            return t.entity_id;
          }),
        );

        return ok(
          results.map((r, i) => ({
            entity_id: targets[i].entity_id,
            success: r.status === "fulfilled",
            error: r.status === "rejected" ? String((r as PromiseRejectedResult).reason?.message ?? r.reason) : undefined,
          })),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );
}
