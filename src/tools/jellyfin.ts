import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JellyfinClient } from "../clients/jellyfin.js";
import { genericApiShape, makeTool } from "./common.js";

export function registerJellyfinTools(server: McpServer, client: JellyfinClient, readOnly: boolean, counter?: { count: number }) {
  const tool = makeTool(server, readOnly, counter);

  tool("jellyfin_system_info", "Jellyfin: Systeminformationen und Version.", {}, false, () => client.api("/System/Info"));
  tool("jellyfin_system_logs", "Jellyfin: Liste der Logdateien.", {}, false, () => client.api("/System/Logs"));
  tool("jellyfin_get_log", "Jellyfin: Inhalt einer Logdatei.", { name: z.string() }, false, ({ name }) =>
    client.api("/System/Logs/Log", { query: { name } }),
  );
  tool("jellyfin_activity_log", "Jellyfin: Aktivitätsprotokoll.", { limit: z.number().int().default(50) }, false, ({ limit }) =>
    client.api("/System/ActivityLog/Entries", { query: { limit } }),
  );
  tool("jellyfin_restart_server", "Jellyfin: Server neu starten.", {}, true, () => client.api("/System/Restart", { method: "POST" }));

  tool("jellyfin_list_users", "Jellyfin: Alle Benutzer.", {}, false, () => client.api("/Users"));
  tool("jellyfin_create_user", "Jellyfin: Benutzer anlegen.", { name: z.string(), password: z.string().optional() }, true, ({ name, password }) =>
    client.api("/Users/New", { method: "POST", body: { Name: name, Password: password } }),
  );
  tool("jellyfin_delete_user", "Jellyfin: Benutzer löschen.", { user_id: z.string() }, true, ({ user_id }) =>
    client.api(`/Users/${user_id}`, { method: "DELETE" }),
  );
  tool(
    "jellyfin_update_user_policy",
    "Jellyfin: Rechte eines Benutzers ändern (Policy-Objekt, z. B. {IsDisabled:true}); wird mit der aktuellen Policy zusammengeführt.",
    { user_id: z.string(), changes: z.record(z.any()) },
    true,
    async ({ user_id, changes }) => {
      const user = await client.api<{ Policy: Record<string, unknown> }>(`/Users/${user_id}`);
      return client.api(`/Users/${user_id}/Policy`, { method: "POST", body: { ...user.Policy, ...changes } });
    },
  );

  tool("jellyfin_get_sessions", "Jellyfin: Aktive Sessions (wer schaut gerade was).", {}, false, () => client.api("/Sessions"));
  tool(
    "jellyfin_session_command",
    "Jellyfin: Wiedergabebefehl an eine Session (PlayPause, Pause, Unpause, Stop, NextTrack, PreviousTrack).",
    { session_id: z.string(), command: z.string() },
    true,
    ({ session_id, command }) => client.api(`/Sessions/${session_id}/Playing/${command}`, { method: "POST" }),
  );
  tool(
    "jellyfin_send_message",
    "Jellyfin: Nachricht auf dem Bildschirm einer Session anzeigen.",
    { session_id: z.string(), header: z.string(), text: z.string(), timeout_ms: z.number().int().default(5000) },
    true,
    ({ session_id, header, text, timeout_ms }) =>
      client.api(`/Sessions/${session_id}/Message`, { method: "POST", body: { Header: header, Text: text, TimeoutMs: timeout_ms } }),
  );

  tool(
    "jellyfin_search",
    "Jellyfin: Bibliothek durchsuchen.",
    { query: z.string(), item_types: z.string().optional().describe("z. B. 'Movie,Series,Episode'"), limit: z.number().int().default(50) },
    false,
    ({ query, item_types, limit }) => client.api("/Items", { query: { searchTerm: query, includeItemTypes: item_types, recursive: true, limit } }),
  );
  tool("jellyfin_get_item", "Jellyfin: Details zu einem Eintrag.", { item_id: z.string() }, false, ({ item_id }) =>
    client.api(`/Items/${item_id}`),
  );
  tool(
    "jellyfin_latest_media",
    "Jellyfin: Zuletzt hinzugefügte Medien eines Benutzers.",
    { user_id: z.string(), limit: z.number().int().default(20) },
    false,
    ({ user_id, limit }) => client.api(`/Users/${user_id}/Items/Latest`, { query: { limit } }),
  );
  tool("jellyfin_delete_item", "Jellyfin: Eintrag (inkl. Datei auf der Platte!) löschen.", { item_id: z.string() }, true, ({ item_id }) =>
    client.api(`/Items/${item_id}`, { method: "DELETE" }),
  );
  tool(
    "jellyfin_mark_played",
    "Jellyfin: Eintrag für einen Benutzer als gesehen / ungesehen markieren.",
    { user_id: z.string(), item_id: z.string(), played: z.boolean() },
    true,
    ({ user_id, item_id, played }) =>
      client.api(`/Users/${user_id}/PlayedItems/${item_id}`, { method: played ? "POST" : "DELETE" }),
  );

  tool("jellyfin_list_libraries", "Jellyfin: Bibliotheken (virtuelle Ordner).", {}, false, () => client.api("/Library/VirtualFolders"));
  tool("jellyfin_refresh_library", "Jellyfin: Alle Bibliotheken neu einlesen.", {}, true, () => client.api("/Library/Refresh", { method: "POST" }));
  tool(
    "jellyfin_refresh_item",
    "Jellyfin: Metadaten eines einzelnen Eintrags neu laden.",
    { item_id: z.string(), replace_all: z.boolean().default(false) },
    true,
    ({ item_id, replace_all }) =>
      client.api(`/Items/${item_id}/Refresh`, {
        method: "POST",
        query: { metadataRefreshMode: "FullRefresh", imageRefreshMode: "FullRefresh", replaceAllMetadata: replace_all },
      }),
  );

  tool("jellyfin_scheduled_tasks", "Jellyfin: Geplante Aufgaben.", {}, false, () => client.api("/ScheduledTasks"));
  tool("jellyfin_run_task", "Jellyfin: Geplante Aufgabe jetzt starten.", { task_id: z.string() }, true, ({ task_id }) =>
    client.api(`/ScheduledTasks/Running/${task_id}`, { method: "POST" }),
  );
  tool("jellyfin_list_plugins", "Jellyfin: Installierte Plugins.", {}, false, () => client.api("/Plugins"));
  tool("jellyfin_list_devices", "Jellyfin: Bekannte Geräte.", {}, false, () => client.api("/Devices"));
  tool("jellyfin_list_api_keys", "Jellyfin: API-Schlüssel.", {}, false, () => client.api("/Auth/Keys"));
  tool("jellyfin_create_api_key", "Jellyfin: API-Schlüssel anlegen.", { app: z.string() }, true, ({ app }) =>
    client.api("/Auth/Keys", { method: "POST", query: { app } }),
  );
  tool("jellyfin_delete_api_key", "Jellyfin: API-Schlüssel löschen.", { key: z.string() }, true, ({ key }) =>
    client.api(`/Auth/Keys/${key}`, { method: "DELETE" }),
  );
  tool(
    "jellyfin_api",
    "Jellyfin: Generalschlüssel – beliebiger Aufruf der Jellyfin-API (Pfad z. B. /Items). GET frei, alles andere nur ohne READ_ONLY.",
    genericApiShape,
    (a) => a.method !== "GET",
    ({ method, path, query, body }) => client.api(path, { method, query, body }),
  );
}
