import { request } from "./http.js";
import type { PortainerConfig } from "../config.js";

/**
 * Voller Zugriff auf die Portainer-API (2.x): Environments/Endpoints,
 * Container (Docker-Proxy unter /api/endpoints/{id}/docker/...), Stacks
 * und Images. Auth entweder per API-Key-Header (X-API-Key, empfohlen –
 * unter "My Account -> Access Tokens" erzeugen) oder per Benutzer/Passwort
 * (Login-Token wird automatisch geholt und gecacht).
 */
export class PortainerClient {
  private jwt?: string;

  constructor(private readonly cfg: PortainerConfig) {}

  private async authHeader(): Promise<Record<string, string>> {
    if (this.cfg.apiKey) {
      return { "X-API-Key": this.cfg.apiKey };
    }
    if (!this.jwt) {
      const res = await request<{ jwt: string }>(this.cfg.baseUrl, "/api/auth", {
        method: "POST",
        body: { username: this.cfg.username, password: this.cfg.password },
        insecureTLS: this.cfg.insecureTls,
      });
      this.jwt = res.jwt;
    }
    return { Authorization: `Bearer ${this.jwt}` };
  }

  private async api<T>(path: string, opts: Parameters<typeof request>[2] = {}): Promise<T> {
    const auth = await this.authHeader();
    return request<T>(this.cfg.baseUrl, `/api${path}`, {
      ...opts,
      headers: { ...auth, ...(opts.headers ?? {}) },
      insecureTLS: this.cfg.insecureTls,
    });
  }

  // --- Environments (Endpoints) -------------------------------------------
  listEndpoints() {
    return this.api<Array<Record<string, unknown>>>("/endpoints");
  }

  getEndpoint(endpointId: number) {
    return this.api<Record<string, unknown>>(`/endpoints/${endpointId}`);
  }

  // --- Container (via Docker-API-Proxy) -----------------------------------
  listContainers(endpointId: number, all = true) {
    return this.api<Array<Record<string, unknown>>>(`/endpoints/${endpointId}/docker/containers/json`, {
      query: { all },
    });
  }

  inspectContainer(endpointId: number, containerId: string) {
    return this.api<Record<string, unknown>>(`/endpoints/${endpointId}/docker/containers/${containerId}/json`);
  }

  createContainer(endpointId: number, name: string, spec: Record<string, unknown>) {
    return this.api(`/endpoints/${endpointId}/docker/containers/create`, {
      method: "POST",
      query: { name },
      body: spec,
    });
  }

  startContainer(endpointId: number, containerId: string) {
    return this.api(`/endpoints/${endpointId}/docker/containers/${containerId}/start`, { method: "POST" });
  }

  stopContainer(endpointId: number, containerId: string) {
    return this.api(`/endpoints/${endpointId}/docker/containers/${containerId}/stop`, { method: "POST" });
  }

  restartContainer(endpointId: number, containerId: string) {
    return this.api(`/endpoints/${endpointId}/docker/containers/${containerId}/restart`, { method: "POST" });
  }

  pauseContainer(endpointId: number, containerId: string) {
    return this.api(`/endpoints/${endpointId}/docker/containers/${containerId}/pause`, { method: "POST" });
  }

  unpauseContainer(endpointId: number, containerId: string) {
    return this.api(`/endpoints/${endpointId}/docker/containers/${containerId}/unpause`, { method: "POST" });
  }

  removeContainer(endpointId: number, containerId: string, force = false, removeVolumes = false) {
    return this.api(`/endpoints/${endpointId}/docker/containers/${containerId}`, {
      method: "DELETE",
      query: { force, v: removeVolumes },
    });
  }

  getContainerLogs(endpointId: number, containerId: string, tail = 200) {
    return request<string>(this.cfg.baseUrl, `/api/endpoints/${endpointId}/docker/containers/${containerId}/logs`, {
      headers: this.jwt ? { Authorization: `Bearer ${this.jwt}` } : { "X-API-Key": this.cfg.apiKey ?? "" },
      query: { stdout: true, stderr: true, tail, timestamps: true },
      insecureTLS: this.cfg.insecureTls,
    });
  }

  // --- Images --------------------------------------------------------------
  listImages(endpointId: number) {
    return this.api<Array<Record<string, unknown>>>(`/endpoints/${endpointId}/docker/images/json`);
  }

  pullImage(endpointId: number, image: string) {
    return this.api(`/endpoints/${endpointId}/docker/images/create`, {
      method: "POST",
      query: { fromImage: image },
    });
  }

  removeImage(endpointId: number, imageId: string, force = false) {
    return this.api(`/endpoints/${endpointId}/docker/images/${imageId}`, {
      method: "DELETE",
      query: { force },
    });
  }

  // --- Stacks (Docker Compose) ----------------------------------------------
  listStacks() {
    return this.api<Array<Record<string, unknown>>>("/stacks");
  }

  getStack(stackId: number) {
    return this.api<Record<string, unknown>>(`/stacks/${stackId}`);
  }

  getStackFile(stackId: number) {
    return this.api<{ StackFileContent: string }>(`/stacks/${stackId}/file`);
  }

  createStack(name: string, endpointId: number, composeFileContent: string, env?: Array<{ name: string; value: string }>) {
    return this.api("/stacks/create/standalone/string", {
      method: "POST",
      query: { endpointId },
      body: { name, stackFileContent: composeFileContent, env: env ?? [] },
    });
  }

  updateStack(stackId: number, endpointId: number, composeFileContent: string, env?: Array<{ name: string; value: string }>, prune = true) {
    return this.api(`/stacks/${stackId}`, {
      method: "PUT",
      query: { endpointId },
      body: { stackFileContent: composeFileContent, env: env ?? [], prune },
    });
  }

  deleteStack(stackId: number, endpointId: number) {
    return this.api(`/stacks/${stackId}`, { method: "DELETE", query: { endpointId } });
  }

  startStack(stackId: number, endpointId: number) {
    return this.api(`/stacks/${stackId}/start`, { method: "POST", query: { endpointId } });
  }

  stopStack(stackId: number, endpointId: number) {
    return this.api(`/stacks/${stackId}/stop`, { method: "POST", query: { endpointId } });
  }
}
