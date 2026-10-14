import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { UnifiClient } from "../clients/unifi.js";
import { genericApiShape, makeTool } from "./common.js";

export function registerUnifiTools(server: McpServer, client: UnifiClient, readOnly: boolean, counter?: { count: number }) {
  const tool = makeTool(server, readOnly, counter);
  const site = z.string().describe("Site-ID (aus unifi_list_sites)");
  const id = (what: string) => z.string().describe(`ID ${what}`);
  const paging = { limit: z.number().int().default(100), offset: z.number().int().default(0), filter: z.string().optional().describe("Filter-Ausdruck der UniFi-API, z. B. name.eq('LAN')") };
  const obj = z.record(z.any());

  tool("unifi_info", "UniFi: Version der Network-Anwendung.", {}, false, () => client.api("/info"));
  tool("unifi_list_sites", "UniFi: Alle Sites (nötig für die site_id der anderen Tools).", { limit: z.number().int().default(100) }, false, ({ limit }) =>
    client.api("/sites", { query: { limit } }),
  );

  /** Standard-CRUD für Ressourcen unterhalb einer Site. */
  function crud(name: string, path: string, label: string, opts: { noUpdate?: boolean; noCreate?: boolean; noDelete?: boolean } = {}) {
    tool(`unifi_list_${name}s`, `UniFi: ${label} auflisten.`, { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
      client.api(`/sites/${site_id}${path}`, { query: { limit, offset, filter } }),
    );
    tool(`unifi_get_${name}`, `UniFi: ${label} – Einzelheiten.`, { site_id: site, item_id: id("des Eintrags") }, false, ({ site_id, item_id }) =>
      client.api(`/sites/${site_id}${path}/${item_id}`),
    );
    if (!opts.noCreate)
      tool(`unifi_create_${name}`, `UniFi: ${label} anlegen (JSON-Objekt wie in get/list).`, { site_id: site, config: obj }, true, ({ site_id, config }) =>
        client.api(`/sites/${site_id}${path}`, { method: "POST", body: config }),
      );
    if (!opts.noUpdate)
      tool(`unifi_update_${name}`, `UniFi: ${label} ändern (komplettes Objekt, wie von get geliefert).`, { site_id: site, item_id: id("des Eintrags"), config: obj }, true, ({ site_id, item_id, config }) =>
        client.api(`/sites/${site_id}${path}/${item_id}`, { method: "PUT", body: config }),
      );
    if (!opts.noDelete)
      tool(`unifi_delete_${name}`, `UniFi: ${label} löschen.`, { site_id: site, item_id: id("des Eintrags") }, true, ({ site_id, item_id }) =>
        client.api(`/sites/${site_id}${path}/${item_id}`, { method: "DELETE" }),
      );
  }

  // Netzwerk & WLAN
  crud("network", "/networks", "Netzwerk / VLAN");
  crud("wifi", "/wifi/broadcasts", "WLAN (SSID)");

  // Firewall
  crud("firewall_zone", "/firewall/zones", "Firewall-Zone");
  crud("firewall_policy", "/firewall/policies", "Firewall-Regel");
  tool("unifi_get_firewall_policy_ordering", "UniFi: Reihenfolge der Firewall-Regeln zwischen zwei Zonen.", { site_id: site, source_zone_id: id("der Quell-Zone"), destination_zone_id: id("der Ziel-Zone") }, false, ({ site_id, source_zone_id, destination_zone_id }) =>
    client.api(`/sites/${site_id}/firewall/policies/ordering`, { query: { sourceFirewallZoneId: source_zone_id, destinationFirewallZoneId: destination_zone_id } }),
  );
  tool(
    "unifi_set_firewall_policy_ordering",
    "UniFi: Reihenfolge der Firewall-Regeln zwischen zwei Zonen setzen.",
    { site_id: site, source_zone_id: id("der Quell-Zone"), destination_zone_id: id("der Ziel-Zone"), ordering: obj.describe("Objekt wie von get_firewall_policy_ordering") },
    true,
    ({ site_id, source_zone_id, destination_zone_id, ordering }) =>
      client.api(`/sites/${site_id}/firewall/policies/ordering`, {
        method: "PUT",
        query: { sourceFirewallZoneId: source_zone_id, destinationFirewallZoneId: destination_zone_id },
        body: ordering,
      }),
  );
  crud("acl_rule", "/acl-rules", "ACL-Regel");
  crud("traffic_matching_list", "/traffic-matching-lists", "Traffic-Matching-Liste (IP-/Port-Gruppen)");
  crud("dns_policy", "/dns/policies", "DNS-Richtlinie");

  // Geräte
  tool("unifi_list_devices", "UniFi: Adoptierte Geräte (Gateway, Switches, Access Points).", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/devices`, { query: { limit, offset, filter } }),
  );
  tool("unifi_get_device", "UniFi: Ein Gerät im Detail.", { site_id: site, device_id: id("des Geräts") }, false, ({ site_id, device_id }) =>
    client.api(`/sites/${site_id}/devices/${device_id}`),
  );
  tool("unifi_device_statistics", "UniFi: Aktuelle Statistik eines Geräts (CPU, RAM, Traffic, Uptime).", { site_id: site, device_id: id("des Geräts") }, false, ({ site_id, device_id }) =>
    client.api(`/sites/${site_id}/devices/${device_id}/statistics/latest`),
  );
  tool("unifi_list_pending_devices", "UniFi: Noch nicht adoptierte Geräte.", { limit: z.number().int().default(100) }, false, ({ limit }) =>
    client.api("/pending-devices", { query: { limit } }),
  );
  tool(
    "unifi_device_action",
    "UniFi: Aktion an einem Gerät ausführen (z. B. RESTART).",
    { site_id: site, device_id: id("des Geräts"), action: z.string().default("RESTART") },
    true,
    ({ site_id, device_id, action }) => client.api(`/sites/${site_id}/devices/${device_id}/actions`, { method: "POST", body: { action } }),
  );
  tool(
    "unifi_port_action",
    "UniFi: Aktion an einem Switch-Port (z. B. POWER_CYCLE für PoE-Neustart).",
    { site_id: site, device_id: id("des Switches"), port_idx: z.number().int(), action: z.string().default("POWER_CYCLE") },
    true,
    ({ site_id, device_id, port_idx, action }) =>
      client.api(`/sites/${site_id}/devices/${device_id}/interfaces/ports/${port_idx}/actions`, { method: "POST", body: { action } }),
  );
  tool("unifi_adopt_device", "UniFi: Gerät adoptieren.", { site_id: site, adoption: obj.describe("z. B. {macAddress:'aa:bb:..', ignoreDeviceLimit:false}") }, true, ({ site_id, adoption }) =>
    client.api(`/sites/${site_id}/devices`, { method: "POST", body: adoption }),
  );
  tool("unifi_remove_device", "UniFi: Gerät entfernen (aus der Site löschen).", { site_id: site, device_id: id("des Geräts") }, true, ({ site_id, device_id }) =>
    client.api(`/sites/${site_id}/devices/${device_id}`, { method: "DELETE" }),
  );

  // Clients
  tool("unifi_list_clients", "UniFi: Verbundene Clients (Geräte im Netz).", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/clients`, { query: { limit, offset, filter } }),
  );
  tool("unifi_get_client", "UniFi: Ein Client im Detail.", { site_id: site, client_id: id("des Clients") }, false, ({ site_id, client_id }) =>
    client.api(`/sites/${site_id}/clients/${client_id}`),
  );
  tool(
    "unifi_client_action",
    "UniFi: Aktion für einen Client (z. B. AUTHORIZE_GUEST_ACCESS / UNAUTHORIZE_GUEST_ACCESS).",
    { site_id: site, client_id: id("des Clients"), action: z.string(), params: obj.optional().describe("Weitere Felder, z. B. timeLimitMinutes") },
    true,
    ({ site_id, client_id, action, params }) =>
      client.api(`/sites/${site_id}/clients/${client_id}/actions`, { method: "POST", body: { action, ...(params ?? {}) } }),
  );

  // Hotspot / Gast-Vouchers
  tool("unifi_list_vouchers", "UniFi: Hotspot-Gutscheine (Gast-WLAN).", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/hotspot/vouchers`, { query: { limit, offset, filter } }),
  );
  tool("unifi_create_vouchers", "UniFi: Hotspot-Gutscheine erzeugen (count, name, timeLimitMinutes …).", { site_id: site, config: obj }, true, ({ site_id, config }) =>
    client.api(`/sites/${site_id}/hotspot/vouchers`, { method: "POST", body: config }),
  );
  tool("unifi_delete_voucher", "UniFi: Hotspot-Gutschein löschen.", { site_id: site, voucher_id: id("des Gutscheins") }, true, ({ site_id, voucher_id }) =>
    client.api(`/sites/${site_id}/hotspot/vouchers/${voucher_id}`, { method: "DELETE" }),
  );

  // Nur lesen: WAN, VPN, RADIUS, Referenzdaten
  tool("unifi_list_wans", "UniFi: WAN-Anschlüsse.", { site_id: site }, false, ({ site_id }) => client.api(`/sites/${site_id}/wans`));
  tool("unifi_list_vpn_servers", "UniFi: VPN-Server.", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/vpn/servers`, { query: { limit, offset, filter } }),
  );
  tool("unifi_list_site_to_site_tunnels", "UniFi: Site-to-Site-VPN-Tunnel.", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/vpn/site-to-site-tunnels`, { query: { limit, offset, filter } }),
  );
  tool("unifi_list_radius_profiles", "UniFi: RADIUS-Profile.", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/radius/profiles`, { query: { limit, offset, filter } }),
  );
  tool("unifi_list_device_tags", "UniFi: Geräte-Tags.", { site_id: site, ...paging }, false, ({ site_id, limit, offset, filter }) =>
    client.api(`/sites/${site_id}/device-tags`, { query: { limit, offset, filter } }),
  );
  tool("unifi_list_dpi_categories", "UniFi: DPI-Anwendungskategorien (für Firewall-Regeln).", {}, false, () => client.api("/dpi/categories"));
  tool("unifi_list_dpi_applications", "UniFi: DPI-Anwendungen (für Firewall-Regeln).", {}, false, () => client.api("/dpi/applications"));
  tool("unifi_list_countries", "UniFi: Länderliste (für Geo-Regeln).", {}, false, () => client.api("/countries"));

  tool(
    "unifi_api",
    "UniFi: Generalschlüssel – beliebiger Aufruf der UniFi-Network-Integration-API (Pfad ab /integration/v1, z. B. /sites). GET frei, alles andere nur ohne READ_ONLY.",
    genericApiShape,
    (a) => a.method !== "GET",
    ({ method, path, query, body }) => client.api(path, { method, query, body }),
  );
}
