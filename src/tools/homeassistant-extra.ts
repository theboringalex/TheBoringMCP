import { hostname } from "node:os";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HomeAssistantConfig } from "../config.js";
import { HomeAssistantClient } from "../clients/homeassistant.js";
import { request } from "../clients/http.js";

/**
 * Ergänzungen aus dem Funktionsumfang von ha-mcp (homeassistant-ai/ha-mcp),
 * die TheBoringMCP bisher nicht hatte:
 *
 *  - ha-mcp-kompatible Namen für Automationen/Skripte/Szenen
 *    (`ha_config_get|set|remove_automation|script|scene`), `ha_eval_template`
 *    und `ha_reload_core`. Die bestehenden Tools (`ha_get_automation`, ...)
 *    bleiben unverändert erhalten.
 *  - Supervisor-Funktionen (`ha_get_app`, `ha_manage_app`, `ha_manage_updates`),
 *    nur verfügbar, wenn das Add-on mit Supervisor-Token läuft (SUPERVISOR_TOKEN).
 *
 * Bewusst NICHT übernommen (siehe DOCS.md): Datei-/YAML-Zugriff auf /config
 * (würde einen weiteren Mount brauchen), Screenshot-/Browser-Tools und
 * ha-mcp-interne Meta-Tools (Skill-Guides, Issue-Reporter, Operation-Status).
 */

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

const READ_ONLY_MSG = "Server läuft im READ_ONLY-Modus.";

type ConfigKind = "automation" | "script" | "scene";

const CONFIG_KINDS: Record<ConfigKind, { label: string; get: string; set: string; del: string }> = {
  automation: { label: "Automation", get: "getAutomationConfig", set: "setAutomationConfig", del: "deleteAutomationConfig" },
  script: { label: "Skript", get: "getScriptConfig", set: "setScriptConfig", del: "deleteScriptConfig" },
  scene: { label: "Szene", get: "getSceneConfig", set: "setSceneConfig", del: "deleteSceneConfig" },
};

/** Entity-ID (`automation.foo`) oder interne ID -> ID der Config-API. */
async function resolveConfigId(client: HomeAssistantClient, kind: ConfigKind, identifier: string): Promise<string> {
  if (!identifier.includes(".")) return identifier;
  const [domain, objectId] = identifier.split(".", 2);
  if (domain !== kind) throw new Error(`'${identifier}' ist keine ${CONFIG_KINDS[kind].label}-Entity.`);
  if (kind === "script") return objectId; // Skript-ID == object_id
  const state = (await client.getState(identifier)) as { attributes?: { id?: string } };
  const id = state.attributes?.id;
  if (!id) throw new Error(`Für '${identifier}' wurde keine interne ID gefunden (YAML-definiert? Dann nicht über die UI-Config-API änderbar).`);
  return String(id);
}

type Dyn = Record<string, (...args: unknown[]) => Promise<unknown>>;

const RELOAD_TARGETS: Record<string, { domain: string; service: string }> = {
  all: { domain: "homeassistant", service: "reload_all" },
  core: { domain: "homeassistant", service: "reload_core_config" },
  automations: { domain: "automation", service: "reload" },
  scripts: { domain: "script", service: "reload" },
  scenes: { domain: "scene", service: "reload" },
  groups: { domain: "group", service: "reload" },
  templates: { domain: "template", service: "reload" },
  themes: { domain: "frontend", service: "reload_themes" },
  input_booleans: { domain: "input_boolean", service: "reload" },
  input_numbers: { domain: "input_number", service: "reload" },
  input_selects: { domain: "input_select", service: "reload" },
  input_texts: { domain: "input_text", service: "reload" },
  input_datetimes: { domain: "input_datetime", service: "reload" },
  input_buttons: { domain: "input_button", service: "reload" },
  timers: { domain: "timer", service: "reload" },
  counters: { domain: "counter", service: "reload" },
  schedules: { domain: "schedule", service: "reload" },
  zones: { domain: "zone", service: "reload" },
  persons: { domain: "person", service: "reload" },
};

export function registerHomeAssistantExtraTools(server: McpServer, cfg: HomeAssistantConfig, readOnly: boolean) {
  const client = new HomeAssistantClient(cfg);

  // --- ha-mcp-kompatible Config-Tools ---------------------------------------
  for (const kind of Object.keys(CONFIG_KINDS) as ConfigKind[]) {
    const meta = CONFIG_KINDS[kind];
    const c = client as unknown as Dyn;

    server.tool(
      `ha_config_get_${kind}`,
      `${meta.label}-Konfiguration lesen (Alias im ha-mcp-Stil). identifier = Entity-ID (z.B. ${kind}.beispiel) oder interne ID.`,
      { identifier: z.string() },
      async ({ identifier }) => {
        try {
          const id = await resolveConfigId(client, kind, identifier);
          return ok(await c[meta.get](id));
        } catch (e) {
          return fail(e);
        }
      },
    );

    server.tool(
      `ha_config_set_${kind}`,
      `${meta.label} anlegen oder ändern (Alias im ha-mcp-Stil). Ohne identifier wird eine neue ID erzeugt. config = vollständiges Konfigurationsobjekt (nicht nur Änderungen).`,
      { config: z.record(z.unknown()), identifier: z.string().optional() },
      async ({ config, identifier }) => {
        if (readOnly) return fail(READ_ONLY_MSG);
        try {
          const id = identifier ? await resolveConfigId(client, kind, identifier) : String(Date.now());
          const result = await c[meta.set](id, config);
          return ok({ id, result });
        } catch (e) {
          return fail(e);
        }
      },
    );

    server.tool(
      `ha_config_remove_${kind}`,
      `${meta.label} löschen (Alias im ha-mcp-Stil). identifier = Entity-ID oder interne ID.`,
      { identifier: z.string() },
      async ({ identifier }) => {
        if (readOnly) return fail(READ_ONLY_MSG);
        try {
          const id = await resolveConfigId(client, kind, identifier);
          return ok(await c[meta.del](id));
        } catch (e) {
          return fail(e);
        }
      },
    );
  }

  server.tool(
    "ha_eval_template",
    "Jinja2-Template in Home Assistant auswerten (Alias zu ha_render_template im ha-mcp-Stil).",
    { template: z.string() },
    async ({ template }) => {
      try {
        return ok(await client.renderTemplate(template));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_reload_core",
    `Konfiguration gezielt neu laden, ohne Neustart. target: ${Object.keys(RELOAD_TARGETS).join(", ")}.`,
    { target: z.enum(Object.keys(RELOAD_TARGETS) as [string, ...string[]]).default("all") },
    async ({ target }) => {
      if (readOnly) return fail(READ_ONLY_MSG);
      try {
        const t = RELOAD_TARGETS[target];
        await client.callService(t.domain, t.service);
        return ok({ reloaded: target, service: `${t.domain}.${t.service}` });
      } catch (e) {
        return fail(e);
      }
    },
  );

  // --- Supervisor: Apps (Add-ons) und Updates ----------------------------------
  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (!supervisorToken) return;

  const supervisor = async <T = unknown>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> => {
    const res = await request<{ result?: string; message?: string; data?: T } | string>("http://supervisor", path, {
      method,
      body,
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    if (typeof res === "string") return res as unknown as T; // z.B. Logs als Text
    if (res && typeof res === "object" && res.result === "error") throw new Error(res.message ?? "Supervisor-Fehler");
    return (res && typeof res === "object" && "data" in res ? res.data : res) as T;
  };

  // Der eigene Container heißt wie der Slug (mit "-" statt "_") – damit sich TheBoringMCP nicht selbst stoppt.
  const isSelf = (slug: string) => slug === "self" || slug.replace(/_/g, "-") === hostname();
  const SLUG = z.string().regex(/^[a-zA-Z0-9_]+$/, "Ungültiger Add-on-Slug");

  server.tool(
    "ha_get_app",
    "Apps (Add-ons) des Supervisors: ohne slug alle installierten Apps mit Status/Version/Update-Hinweis, mit slug Details; include_logs=true liefert zusätzlich die letzten Logzeilen.",
    { slug: SLUG.optional(), include_logs: z.boolean().default(false), log_lines: z.number().int().min(1).max(500).default(100) },
    async ({ slug, include_logs, log_lines }) => {
      try {
        if (!slug) {
          const data = (await supervisor<{ addons?: Array<Record<string, unknown>> }>("/addons")) ?? {};
          const addons = (data.addons ?? []).map((a) => ({
            slug: a.slug,
            name: a.name,
            state: a.state,
            version: a.version,
            version_latest: a.version_latest,
            update_available: a.update_available,
            repository: a.repository,
          }));
          return ok(addons);
        }
        const info = (await supervisor<Record<string, unknown>>(`/addons/${slug}/info`)) ?? {};
        // Gespeicherte Optionen können Zugangsdaten enthalten – nie ausgeben.
        const { options: _options, ...safe } = info;
        const out: Record<string, unknown> = { ...safe, options: "(aus Sicherheitsgründen nicht ausgegeben)" };
        if (include_logs) {
          const logs = await supervisor<string>(`/addons/${slug}/logs`);
          out.logs = String(logs).split("\n").slice(-log_lines).join("\n");
        }
        return ok(out);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_manage_app",
    "App (Add-on) steuern: start, stop, restart oder update. Das eigene Add-on (TheBoringMCP) wird zum Schutz nicht angefasst.",
    { slug: SLUG, action: z.enum(["start", "stop", "restart", "update"]) },
    async ({ slug, action }) => {
      if (readOnly) return fail(READ_ONLY_MSG);
      if (isSelf(slug)) return fail("TheBoringMCP kann sich nicht selbst steuern – bitte in der Home-Assistant-Oberfläche erledigen.");
      try {
        return ok(await supervisor(`/addons/${slug}/${action}`, "POST"));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "ha_manage_updates",
    "Verfügbare Updates auflisten (action=list) oder ein Update installieren (action=update; target: core, os, supervisor oder addon + slug). Update des eigenen Add-ons wird nicht ausgeführt.",
    {
      action: z.enum(["list", "update"]).default("list"),
      target: z.enum(["core", "os", "supervisor", "addon"]).optional(),
      slug: SLUG.optional(),
    },
    async ({ action, target, slug }) => {
      try {
        if (action === "list") return ok(await supervisor("/available_updates"));
        if (readOnly) return fail(READ_ONLY_MSG);
        if (!target) return fail("target ist für action=update erforderlich.");
        if (target === "addon") {
          if (!slug) return fail("slug ist für target=addon erforderlich.");
          if (isSelf(slug)) return fail("TheBoringMCP kann sich nicht selbst aktualisieren.");
          return ok(await supervisor(`/addons/${slug}/update`, "POST"));
        }
        return ok(await supervisor(`/${target}/update`, "POST"));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
