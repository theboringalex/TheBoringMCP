import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SabnzbdClient } from "../clients/sabnzbd.js";
import { makeTool } from "./common.js";

export function registerSabnzbdTools(server: McpServer, client: SabnzbdClient, readOnly: boolean, counter?: { count: number }) {
  const tool = makeTool(server, readOnly, counter);
  const nzo = z.string().describe("nzo_id des Jobs (aus sabnzbd_get_queue)");

  tool("sabnzbd_version", "SABnzbd: Version.", {}, false, () => client.call("version"));
  tool("sabnzbd_get_queue", "SABnzbd: Aktuelle Download-Warteschlange.", { limit: z.number().int().default(50) }, false, ({ limit }) =>
    client.call("queue", { limit }),
  );
  tool(
    "sabnzbd_get_history",
    "SABnzbd: Verlauf (abgeschlossene / fehlgeschlagene Downloads).",
    { limit: z.number().int().default(30), failed_only: z.boolean().default(false) },
    false,
    ({ limit, failed_only }) => client.call("history", { limit, failed_only: failed_only ? 1 : 0 }),
  );
  tool("sabnzbd_server_stats", "SABnzbd: Traffic-Statistik je Newsserver.", {}, false, () => client.call("server_stats"));
  tool("sabnzbd_status", "SABnzbd: Ausführlicher Status (Speed, freier Platz, Warnungen).", {}, false, () => client.call("fullstatus", { skip_dashboard: 1 }));
  tool("sabnzbd_get_categories", "SABnzbd: Kategorien.", {}, false, () => client.call("get_cats"));
  tool("sabnzbd_get_scripts", "SABnzbd: Verfügbare Skripte.", {}, false, () => client.call("get_scripts"));
  tool("sabnzbd_get_warnings", "SABnzbd: Warnungen und Fehlermeldungen.", {}, false, () => client.call("warnings"));
  tool("sabnzbd_get_config", "SABnzbd: Konfiguration lesen (optional nur ein Abschnitt, z. B. 'misc', 'servers', 'categories').", { section: z.string().optional() }, false, ({ section }) =>
    client.call("get_config", { section }),
  );

  tool(
    "sabnzbd_pause_queue",
    "SABnzbd: Gesamte Warteschlange pausieren (optional für N Minuten).",
    { minutes: z.number().int().optional() },
    true,
    ({ minutes }) => (minutes ? client.call("config", { name: "set_pause", value: minutes }) : client.call("pause")),
  );
  tool("sabnzbd_resume_queue", "SABnzbd: Warteschlange fortsetzen.", {}, true, () => client.call("resume"));
  tool("sabnzbd_pause_job", "SABnzbd: Einzelnen Job pausieren.", { nzo_id: nzo }, true, ({ nzo_id }) =>
    client.call("queue", { name: "pause", value: nzo_id }),
  );
  tool("sabnzbd_resume_job", "SABnzbd: Einzelnen Job fortsetzen.", { nzo_id: nzo }, true, ({ nzo_id }) =>
    client.call("queue", { name: "resume", value: nzo_id }),
  );
  tool(
    "sabnzbd_delete_job",
    "SABnzbd: Job aus der Warteschlange löschen.",
    { nzo_id: nzo, delete_files: z.boolean().default(false) },
    true,
    ({ nzo_id, delete_files }) => client.call("queue", { name: "delete", value: nzo_id, del_files: delete_files ? 1 : 0 }),
  );
  tool(
    "sabnzbd_delete_history",
    "SABnzbd: Verlaufseintrag löschen ('all' oder 'failed' löscht alle bzw. nur fehlgeschlagene).",
    { nzo_id: z.string().describe("nzo_id, 'all' oder 'failed'"), delete_files: z.boolean().default(false) },
    true,
    ({ nzo_id, delete_files }) => client.call("history", { name: "delete", value: nzo_id, del_files: delete_files ? 1 : 0 }),
  );
  tool("sabnzbd_retry_job", "SABnzbd: Fehlgeschlagenen Job erneut versuchen.", { nzo_id: nzo }, true, ({ nzo_id }) =>
    client.call("retry", { value: nzo_id }),
  );
  tool("sabnzbd_retry_all_failed", "SABnzbd: Alle fehlgeschlagenen Jobs erneut versuchen.", {}, true, () => client.call("retry_all"));
  tool(
    "sabnzbd_add_by_url",
    "SABnzbd: NZB per URL hinzufügen.",
    { url: z.string(), name: z.string().optional(), category: z.string().optional(), priority: z.number().int().min(-100).max(2).optional() },
    true,
    ({ url, name, category, priority }) => client.call("addurl", { name: url, nzbname: name, cat: category, priority }),
  );
  tool(
    "sabnzbd_set_priority",
    "SABnzbd: Priorität eines Jobs (-100 Standard-Pause, -1 niedrig, 0 normal, 1 hoch, 2 erzwungen).",
    { nzo_id: nzo, priority: z.number().int() },
    true,
    ({ nzo_id, priority }) => client.call("queue", { name: "priority", value: nzo_id, value2: priority }),
  );
  tool("sabnzbd_change_category", "SABnzbd: Kategorie eines Jobs ändern.", { nzo_id: nzo, category: z.string() }, true, ({ nzo_id, category }) =>
    client.call("change_cat", { value: nzo_id, value2: category }),
  );
  tool("sabnzbd_rename_job", "SABnzbd: Job umbenennen.", { nzo_id: nzo, name: z.string() }, true, ({ nzo_id, name }) =>
    client.call("queue", { name: "rename", value: nzo_id, value2: name }),
  );
  tool(
    "sabnzbd_set_speed_limit",
    "SABnzbd: Geschwindigkeitslimit setzen (z. B. '5M', '500K' oder '50' für Prozent; leer/0 = unbegrenzt).",
    { limit: z.string() },
    true,
    ({ limit }) => client.call("config", { name: "speedlimit", value: limit }),
  );
  tool(
    "sabnzbd_set_config",
    "SABnzbd: Einen Konfigurationswert setzen (section, keyword, value).",
    { section: z.string(), keyword: z.string(), value: z.string() },
    true,
    ({ section, keyword, value }) => client.call("set_config", { section, keyword, value }),
  );
  tool("sabnzbd_clear_warnings", "SABnzbd: Warnungen löschen.", {}, true, () => client.call("warnings", { name: "clear" }));
  tool("sabnzbd_restart", "SABnzbd: Programm neu starten.", {}, true, () => client.call("restart"));
}
