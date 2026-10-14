import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { UnifiProtectClient } from "../clients/unifi-protect.js";
import { genericApiShape, makeTool } from "./common.js";

export function registerUnifiProtectTools(server: McpServer, client: UnifiProtectClient, readOnly: boolean, counter?: { count: number }) {
  const tool = makeTool(server, readOnly, counter);
  const id = (what: string) => z.string().describe(`ID ${what} (aus der jeweiligen list-Funktion)`);
  const changes = z.record(z.any()).describe("Zu ändernde Felder als JSON (Teil-Update)");

  tool("protect_info", "UniFi Protect: Version / Meta-Informationen der Anwendung.", {}, false, () => client.api("/meta/info"));
  tool("protect_get_nvr", "UniFi Protect: Recorder (NVR) – Speicher, Version, Status.", {}, false, () => client.api("/nvrs"));

  // Kameras
  tool("protect_list_cameras", "UniFi Protect: Alle Kameras.", {}, false, () => client.api("/cameras"));
  tool("protect_get_camera", "UniFi Protect: Eine Kamera im Detail.", { camera_id: id("der Kamera") }, false, ({ camera_id }) =>
    client.api(`/cameras/${camera_id}`),
  );
  tool("protect_update_camera", "UniFi Protect: Kameraeinstellungen ändern (Name, Aufnahmemodus, LED, HDR, Mikrofon …).", { camera_id: id("der Kamera"), changes }, true, ({ camera_id, changes }) =>
    client.api(`/cameras/${camera_id}`, { method: "PATCH", body: changes }),
  );
  tool(
    "protect_get_snapshot",
    "UniFi Protect: Aktuelles Standbild einer Kamera (wird als Bild geliefert).",
    { camera_id: id("der Kamera"), high_quality: z.boolean().default(false) },
    false,
    async ({ camera_id, high_quality }) => {
      const img = await client.image(`/cameras/${camera_id}/snapshot`, { highQuality: String(high_quality) });
      return { __image: true as const, ...img };
    },
  );
  tool(
    "protect_create_rtsps_stream",
    "UniFi Protect: RTSPS-Stream-URLs für eine Kamera erzeugen (qualities: high, medium, low, package).",
    { camera_id: id("der Kamera"), qualities: z.array(z.enum(["high", "medium", "low", "package"])).default(["high"]) },
    true,
    ({ camera_id, qualities }) => client.api(`/cameras/${camera_id}/rtsps-stream`, { method: "POST", body: { qualities } }),
  );
  tool("protect_get_rtsps_stream", "UniFi Protect: Vorhandene RTSPS-Stream-URLs einer Kamera.", { camera_id: id("der Kamera") }, false, ({ camera_id }) =>
    client.api(`/cameras/${camera_id}/rtsps-stream`),
  );
  tool(
    "protect_delete_rtsps_stream",
    "UniFi Protect: RTSPS-Stream einer Kamera wieder entfernen.",
    { camera_id: id("der Kamera"), qualities: z.array(z.enum(["high", "medium", "low", "package"])).default(["high"]) },
    true,
    ({ camera_id, qualities }) => client.api(`/cameras/${camera_id}/rtsps-stream`, { method: "DELETE", query: { qualities: qualities.join(",") } }),
  );
  tool("protect_ptz_goto", "UniFi Protect: PTZ-Kamera zur gespeicherten Position fahren.", { camera_id: id("der Kamera"), slot: z.number().int() }, true, ({ camera_id, slot }) =>
    client.api(`/cameras/${camera_id}/ptz/goto/${slot}`, { method: "POST" }),
  );
  tool("protect_ptz_patrol_start", "UniFi Protect: PTZ-Patrouille starten.", { camera_id: id("der Kamera"), slot: z.number().int() }, true, ({ camera_id, slot }) =>
    client.api(`/cameras/${camera_id}/ptz/patrol/start/${slot}`, { method: "POST" }),
  );
  tool("protect_ptz_patrol_stop", "UniFi Protect: PTZ-Patrouille stoppen.", { camera_id: id("der Kamera") }, true, ({ camera_id }) =>
    client.api(`/cameras/${camera_id}/ptz/patrol/stop`, { method: "POST" }),
  );

  // Lichter, Sensoren, Gong, Schlösser
  tool("protect_list_lights", "UniFi Protect: Alle Lichter (Floodlights).", {}, false, () => client.api("/lights"));
  tool("protect_get_light", "UniFi Protect: Ein Licht im Detail.", { light_id: id("des Lichts") }, false, ({ light_id }) => client.api(`/lights/${light_id}`));
  tool("protect_update_light", "UniFi Protect: Licht ändern (Name, Helligkeit, Bewegungsmodus …).", { light_id: id("des Lichts"), changes }, true, ({ light_id, changes }) =>
    client.api(`/lights/${light_id}`, { method: "PATCH", body: changes }),
  );
  tool("protect_list_sensors", "UniFi Protect: Alle Sensoren (Tür/Fenster, Bewegung, Klima).", {}, false, () => client.api("/sensors"));
  tool("protect_get_sensor", "UniFi Protect: Ein Sensor im Detail.", { sensor_id: id("des Sensors") }, false, ({ sensor_id }) => client.api(`/sensors/${sensor_id}`));
  tool("protect_update_sensor", "UniFi Protect: Sensor ändern.", { sensor_id: id("des Sensors"), changes }, true, ({ sensor_id, changes }) =>
    client.api(`/sensors/${sensor_id}`, { method: "PATCH", body: changes }),
  );
  tool("protect_list_chimes", "UniFi Protect: Alle Gongs.", {}, false, () => client.api("/chimes"));
  tool("protect_update_chime", "UniFi Protect: Gong ändern (Lautstärke, Klingeltöne …).", { chime_id: id("des Gongs"), changes }, true, ({ chime_id, changes }) =>
    client.api(`/chimes/${chime_id}`, { method: "PATCH", body: changes }),
  );
  tool("protect_list_doorlocks", "UniFi Protect: Alle Türschlösser.", {}, false, () => client.api("/doorlocks"));
  tool("protect_doorlock_action", "UniFi Protect: Türschloss auf- oder zusperren.", { doorlock_id: id("des Schlosses"), action: z.enum(["unlock", "lock"]) }, true, ({ doorlock_id, action }) =>
    client.api(`/doorlocks/${doorlock_id}/${action}`, { method: "POST" }),
  );

  // Viewer & Live-Ansichten
  tool("protect_list_viewers", "UniFi Protect: Alle Viewer (Viewport-Geräte).", {}, false, () => client.api("/viewers"));
  tool("protect_update_viewer", "UniFi Protect: Viewer ändern (z. B. andere Live-Ansicht zuweisen).", { viewer_id: id("des Viewers"), changes }, true, ({ viewer_id, changes }) =>
    client.api(`/viewers/${viewer_id}`, { method: "PATCH", body: changes }),
  );
  tool("protect_list_liveviews", "UniFi Protect: Alle Live-Ansichten.", {}, false, () => client.api("/liveviews"));
  tool("protect_create_liveview", "UniFi Protect: Live-Ansicht anlegen.", { liveview: z.record(z.any()) }, true, ({ liveview }) =>
    client.api("/liveviews", { method: "POST", body: liveview }),
  );
  tool("protect_update_liveview", "UniFi Protect: Live-Ansicht ändern.", { liveview_id: id("der Live-Ansicht"), changes }, true, ({ liveview_id, changes }) =>
    client.api(`/liveviews/${liveview_id}`, { method: "PATCH", body: changes }),
  );

  // Alarm Manager
  tool("protect_trigger_alarm_webhook", "UniFi Protect: Alarm-Manager-Webhook auslösen.", { webhook_id: z.string() }, true, ({ webhook_id }) =>
    client.api(`/alarm-manager/webhook/${webhook_id}`, { method: "POST" }),
  );

  tool(
    "protect_api",
    "UniFi Protect: Generalschlüssel – beliebiger Aufruf der Protect-Integration-API (Pfad ab /integration/v1, z. B. /cameras). GET frei, alles andere nur ohne READ_ONLY.",
    genericApiShape,
    (a) => a.method !== "GET",
    ({ method, path, query, body }) => client.api(path, { method, query, body }),
  );
}
