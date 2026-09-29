import { request } from "./http.js";
import type { HomeAssistantConfig } from "../config.js";

/**
 * Voller Zugriff auf die Home Assistant REST-API.
 * Nutzt ein Long-Lived Access Token (Profil -> Sicherheit -> Long-Lived Access Tokens).
 *
 * Abgedeckt: States lesen/setzen, Services aufrufen, Config (automation/script/
 * scene) per config-API anlegen/ändern/löschen, Core neu laden, Logs, History,
 * Templates rendern, Areas/Devices/Entities aus der Registry.
 */
export class HomeAssistantClient {
  constructor(private readonly cfg: HomeAssistantConfig) {}

  private headers() {
    return { Authorization: `Bearer ${this.cfg.token}` };
  }

  private api<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/api${path}`, {
      ...opts,
      headers: { ...this.headers(), ...(opts.headers ?? {}) },
    });
  }

  // --- Allgemein -----------------------------------------------------
  getConfig() {
    return this.api<Record<string, unknown>>("/config");
  }

  checkApi() {
    return this.api<{ message: string }>("/");
  }

  // --- States ----------------------------------------------------------
  getStates() {
    return this.api<Array<Record<string, unknown>>>("/states");
  }

  getState(entityId: string) {
    return this.api<Record<string, unknown>>(`/states/${encodeURIComponent(entityId)}`);
  }

  /** Setzt einen Zustand direkt (umgeht die normale Integration – für Test/Vorlagen-Entities gedacht). */
  setState(entityId: string, state: string, attributes?: Record<string, unknown>) {
    return this.api(`/states/${encodeURIComponent(entityId)}`, {
      method: "POST",
      body: { state, attributes },
    });
  }

  deleteState(entityId: string) {
    return this.api(`/states/${encodeURIComponent(entityId)}`, { method: "DELETE" });
  }

  // --- Services / Aktionen ---------------------------------------------
  getServices() {
    return this.api<Array<Record<string, unknown>>>("/services");
  }

  callService(domain: string, service: string, serviceData?: Record<string, unknown>, target?: Record<string, unknown>) {
    return this.api(`/services/${domain}/${service}`, {
      method: "POST",
      body: { ...serviceData, ...(target ? { target } : {}) },
    });
  }

  // --- History / Logbuch -------------------------------------------------
  getHistory(entityIds: string[], startTime?: string, endTime?: string) {
    const path = startTime ? `/history/period/${startTime}` : "/history/period";
    return this.api<unknown>(path, {
      query: {
        filter_entity_id: entityIds.join(","),
        end_time: endTime,
      },
    });
  }

  getLogbook(startTime?: string, endTime?: string, entityId?: string) {
    const path = startTime ? `/logbook/${startTime}` : "/logbook";
    return this.api<unknown>(path, { query: { end_time: endTime, entity: entityId } });
  }

  getErrorLog() {
    return request<string>(this.cfg.baseUrl, "/api/error_log", { headers: this.headers() });
  }

  // --- Templates ---------------------------------------------------------
  renderTemplate(template: string) {
    return this.api<string>("/template", { method: "POST", body: { template } });
  }

  // --- Config: Automationen, Skripte, Szenen (config-API, gleiche wie UI) --
  private configApi<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, `/api/config${path}`, {
      ...opts,
      headers: { ...this.headers(), ...(opts.headers ?? {}) },
    });
  }

  listAutomationConfigs() {
    return this.api<Array<Record<string, unknown>>>("/config/automation/config");
  }

  getAutomationConfig(automationId: string) {
    return this.configApi<Record<string, unknown>>(`/automation/config/${automationId}`);
  }

  setAutomationConfig(automationId: string, config: Record<string, unknown>) {
    return this.configApi(`/automation/config/${automationId}`, { method: "POST", body: config });
  }

  deleteAutomationConfig(automationId: string) {
    return this.configApi(`/automation/config/${automationId}`, { method: "DELETE" });
  }

  getScriptConfig(scriptId: string) {
    return this.configApi<Record<string, unknown>>(`/script/config/${scriptId}`);
  }

  setScriptConfig(scriptId: string, config: Record<string, unknown>) {
    return this.configApi(`/script/config/${scriptId}`, { method: "POST", body: config });
  }

  deleteScriptConfig(scriptId: string) {
    return this.configApi(`/script/config/${scriptId}`, { method: "DELETE" });
  }

  getSceneConfig(sceneId: string) {
    return this.configApi<Record<string, unknown>>(`/scene/config/${sceneId}`);
  }

  setSceneConfig(sceneId: string, config: Record<string, unknown>) {
    return this.configApi(`/scene/config/${sceneId}`, { method: "POST", body: config });
  }

  deleteSceneConfig(sceneId: string) {
    return this.configApi(`/scene/config/${sceneId}`, { method: "DELETE" });
  }

  checkConfig() {
    return this.api<Record<string, unknown>>("/config/core/check_config", { method: "POST" });
  }

  // --- Config-Entries (Integrationen, inkl. Flow-basierte Helper) -------------
  listConfigEntries() {
    return this.configApi<Array<Record<string, unknown>>>("/config_entries/entry");
  }

  deleteConfigEntry(entryId: string) {
    return this.configApi(`/config_entries/entry/${encodeURIComponent(entryId)}`, { method: "DELETE" });
  }

  // --- Core-Steuerung -----------------------------------------------------
  restartCore() {
    return this.api("/services/homeassistant/restart", { method: "POST" });
  }

  reloadCoreConfig() {
    return this.api("/services/homeassistant/reload_core_config", { method: "POST" });
  }

  reloadAll() {
    return this.api("/services/homeassistant/reload_all", { method: "POST" });
  }

  // --- Events --------------------------------------------------------------
  /** Feuert ein beliebiges Event auf den HA-Event-Bus (für event-getriggerte Automationen etc.). */
  fireEvent(eventType: string, eventData?: Record<string, unknown>) {
    return this.api(`/events/${encodeURIComponent(eventType)}`, { method: "POST", body: eventData ?? {} });
  }

  // --- Kalender --------------------------------------------------------------
  getCalendarEvents(entityId: string, start?: string, end?: string) {
    return this.api<Array<Record<string, unknown>>>(`/calendars/${encodeURIComponent(entityId)}`, {
      query: { start, end },
    });
  }

  // --- Kamera -----------------------------------------------------------------
  /** Liefert das aktuelle Kamerabild als Buffer (JPEG). */
  async getCameraImage(entityId: string): Promise<{ contentType: string; base64: string }> {
    const url = `${this.cfg.baseUrl}/api/camera_proxy/${encodeURIComponent(entityId)}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} bei ${url}: ${body.slice(0, 300)}`);
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { contentType, base64: buf.toString("base64") };
  }
}
