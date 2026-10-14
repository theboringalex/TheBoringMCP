import { readFileSync } from "node:fs";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PortainerClient } from "../clients/portainer.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

export function registerPortainerTools(server: McpServer, client: PortainerClient, readOnly: boolean) {
  server.tool("portainer_list_endpoints", "Alle Portainer-Environments/Endpoints auflisten (z.B. NAS, HAOS-VM).", {}, async () => {
    try {
      return ok(await client.listEndpoints());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "portainer_list_containers",
    "Alle Container eines Environments auflisten (inkl. gestoppter).",
    { endpoint_id: z.number().describe("ID des Portainer-Environments, siehe portainer_list_endpoints") },
    async ({ endpoint_id }) => {
      try {
        return ok(await client.listContainers(endpoint_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_inspect_container",
    "Vollständige Detailinformationen zu einem Container abrufen.",
    { endpoint_id: z.number(), container_id: z.string() },
    async ({ endpoint_id, container_id }) => {
      try {
        return ok(await client.inspectContainer(endpoint_id, container_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_create_container",
    "Einen neuen Container erstellen (Docker-Create-Spezifikation, z.B. { Image, Env, HostConfig: { PortBindings, Binds } }).",
    {
      endpoint_id: z.number(),
      name: z.string(),
      spec: z.record(z.unknown()).describe("Docker-Container-Create-Body, siehe Docker Engine API /containers/create"),
    },
    async ({ endpoint_id, name, spec }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createContainer(endpoint_id, name, spec));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_start_container",
    "Container starten.",
    { endpoint_id: z.number(), container_id: z.string() },
    async ({ endpoint_id, container_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.startContainer(endpoint_id, container_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_stop_container",
    "Container stoppen.",
    { endpoint_id: z.number(), container_id: z.string() },
    async ({ endpoint_id, container_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.stopContainer(endpoint_id, container_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_restart_container",
    "Container neu starten.",
    { endpoint_id: z.number(), container_id: z.string() },
    async ({ endpoint_id, container_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.restartContainer(endpoint_id, container_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_pause_container",
    "Container pausieren.",
    { endpoint_id: z.number(), container_id: z.string() },
    async ({ endpoint_id, container_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.pauseContainer(endpoint_id, container_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_unpause_container",
    "Pausierten Container fortsetzen.",
    { endpoint_id: z.number(), container_id: z.string() },
    async ({ endpoint_id, container_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.unpauseContainer(endpoint_id, container_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_remove_container",
    "Container endgültig löschen.",
    { endpoint_id: z.number(), container_id: z.string(), force: z.boolean().optional(), remove_volumes: z.boolean().optional() },
    async ({ endpoint_id, container_id, force, remove_volumes }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.removeContainer(endpoint_id, container_id, force, remove_volumes));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_get_container_logs",
    "Logs eines Containers abrufen.",
    { endpoint_id: z.number(), container_id: z.string(), tail: z.number().optional().default(200) },
    async ({ endpoint_id, container_id, tail }) => {
      try {
        return ok(await client.getContainerLogs(endpoint_id, container_id, tail));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("portainer_list_images", "Alle Docker-Images eines Environments auflisten.", { endpoint_id: z.number() }, async ({ endpoint_id }) => {
    try {
      return ok(await client.listImages(endpoint_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "portainer_pull_image",
    "Ein Docker-Image pullen/aktualisieren (z.B. vor einem Container-Update).",
    { endpoint_id: z.number(), image: z.string().describe("z.B. 'lscr.io/linuxserver/sonarr:latest'") },
    async ({ endpoint_id, image }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.pullImage(endpoint_id, image));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_remove_image",
    "Ein Docker-Image löschen.",
    { endpoint_id: z.number(), image_id: z.string(), force: z.boolean().optional() },
    async ({ endpoint_id, image_id, force }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.removeImage(endpoint_id, image_id, force));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("portainer_list_stacks", "Alle Docker-Compose-Stacks auflisten.", {}, async () => {
    try {
      return ok(await client.listStacks());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("portainer_get_stack_file", "Den Compose-Dateiinhalt eines Stacks abrufen.", { stack_id: z.number() }, async ({ stack_id }) => {
    try {
      return ok(await client.getStackFile(stack_id));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "portainer_create_stack",
    "Einen neuen Stack aus Docker-Compose-Inhalt erstellen.",
    {
      name: z.string(),
      endpoint_id: z.number(),
      compose_content: z.string().describe("Kompletter Inhalt einer docker-compose.yml als String"),
      env: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    },
    async ({ name, endpoint_id, compose_content, env }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createStack(name, endpoint_id, compose_content, env));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_update_stack",
    "Einen bestehenden Stack mit neuem Compose-Inhalt aktualisieren (redeployed die Container).",
    {
      stack_id: z.number(),
      endpoint_id: z.number(),
      compose_content: z.string(),
      env: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      prune: z.boolean().optional().default(true),
    },
    async ({ stack_id, endpoint_id, compose_content, env, prune }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.updateStack(stack_id, endpoint_id, compose_content, env, prune));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_delete_stack",
    "Einen Stack (inkl. aller zugehörigen Container) löschen.",
    { stack_id: z.number(), endpoint_id: z.number() },
    async ({ stack_id, endpoint_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.deleteStack(stack_id, endpoint_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_start_stack",
    "Einen gestoppten Stack starten.",
    { stack_id: z.number(), endpoint_id: z.number() },
    async ({ stack_id, endpoint_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.startStack(stack_id, endpoint_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_stop_stack",
    "Einen laufenden Stack stoppen.",
    { stack_id: z.number(), endpoint_id: z.number() },
    async ({ stack_id, endpoint_id }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.stopStack(stack_id, endpoint_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  registerPortainerGenericTools(server, client, readOnly);
}

// ---------------------------------------------------------------------------
// Erweiterung: Docker-Proxy, komplette Portainer-REST-API, Git-Stacks
// ---------------------------------------------------------------------------

const MAX_OUTPUT_CHARS = 200_000;

function okTruncated(data: unknown) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  if (text && text.length > MAX_OUTPUT_CHARS) {
    return ok(`${text.slice(0, MAX_OUTPUT_CHARS)}\n... [gekürzt: ${text.length} Zeichen insgesamt]`);
  }
  return ok(text ?? "(leere Antwort)");
}

/** Pfad muss relativ zur jeweiligen API-Basis beginnen, darf weder Query noch Traversal enthalten. */
export function validateApiPath(path: string): string | undefined {
  if (!path.startsWith("/")) return "Pfad muss mit '/' beginnen.";
  if (path.includes("..") || path.includes("//") || path.includes("?") || path.includes("#") || /\s/.test(path)) {
    return "Ungültiger Pfad (kein '..', '//', '?', '#' oder Leerzeichen; Query-Parameter über 'query' übergeben).";
  }
  if (!/^\/[A-Za-z0-9/_\-.{}~%:]*$/.test(path)) return "Pfad enthält unzulässige Zeichen.";
  return undefined;
}

interface PortainerOperation {
  m: string;
  p: string;
  s: string;
  t: string | null;
  id: string | null;
}

let operationsCache: PortainerOperation[] | undefined;
function loadOperations(): PortainerOperation[] {
  if (!operationsCache) {
    operationsCache = JSON.parse(
      readFileSync(new URL("../../assets/portainer-operations.json", import.meta.url), "utf8"),
    ) as PortainerOperation[];
  }
  return operationsCache;
}

const QUERY = z.record(z.union([z.string(), z.number(), z.boolean()])).optional();

function registerPortainerGenericTools(server: McpServer, client: PortainerClient, readOnly: boolean) {
  const READ_ONLY_MSG = "Server läuft im READ_ONLY-Modus (nur GET erlaubt).";

  server.tool(
    "portainer_docker_proxy",
    "Beliebiger Aufruf der Docker-Engine-API eines Environments über den Portainer-Proxy – deckt alles ab, wofür es kein eigenes Tool gibt: " +
      "Netzwerke (GET /networks), Volumes (GET /volumes), System (GET /info, /system/df), Container-Statistiken " +
      "(GET /containers/{id}/stats mit query stream=false), Exec, Prune usw. Pfad ohne /docker-Präfix, z.B. '/networks'.",
    {
      endpoint_id: z.number(),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
      path: z.string().describe("Docker-API-Pfad, z.B. /networks oder /volumes/mein_volume"),
      query: QUERY,
      body: z.unknown().optional(),
    },
    async ({ endpoint_id, method, path, query, body }) => {
      const bad = validateApiPath(path);
      if (bad) return fail(bad);
      if (readOnly && method !== "GET") return fail(READ_ONLY_MSG);
      try {
        return okTruncated(await client.dockerProxy(endpoint_id, method, path, query, body));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_api_request",
    "Beliebiger Aufruf der Portainer-REST-API (Pfad relativ zu /api, z.B. '/users', '/teams', '/tags', '/settings', '/registries'). " +
      "Passende Operationen findest du mit portainer_search_api.",
    {
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
      path: z.string().describe("z.B. /users oder /stacks/12"),
      query: QUERY,
      body: z.unknown().optional(),
    },
    async ({ method, path, query, body }) => {
      const bad = validateApiPath(path);
      if (bad) return fail(bad);
      if (readOnly && method !== "GET") return fail(READ_ONLY_MSG);
      try {
        return okTruncated(await client.rest(method, path, query, body));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_search_api",
    "Durchsucht die Portainer-API-Operationen (Methode, Pfad, Kurzbeschreibung, Tag) nach Stichworten, z.B. 'registry', 'user', 'edge', 'webhook'.",
    { query: z.string().min(2), limit: z.number().int().min(1).max(100).default(30) },
    async ({ query, limit }) => {
      try {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const hits = loadOperations().filter((op) => {
          const hay = `${op.m} ${op.p} ${op.s} ${op.t ?? ""} ${op.id ?? ""}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        });
        return ok({ total: hits.length, shown: Math.min(hits.length, limit), operations: hits.slice(0, limit) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("portainer_list_networks", "Docker-Netzwerke eines Environments auflisten.", { endpoint_id: z.number() }, async ({ endpoint_id }) => {
    try {
      return okTruncated(await client.dockerProxy(endpoint_id, "GET", "/networks"));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool("portainer_list_volumes", "Docker-Volumes eines Environments auflisten.", { endpoint_id: z.number() }, async ({ endpoint_id }) => {
    try {
      return okTruncated(await client.dockerProxy(endpoint_id, "GET", "/volumes"));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "portainer_system_info",
    "Docker-Systeminformationen (Version, Ressourcen, Anzahl Container/Images) und Speicherbelegung (system/df) eines Environments.",
    { endpoint_id: z.number(), include_disk_usage: z.boolean().default(false) },
    async ({ endpoint_id, include_disk_usage }) => {
      try {
        const info = await client.dockerProxy(endpoint_id, "GET", "/info");
        if (!include_disk_usage) return okTruncated(info);
        const df = await client.dockerProxy(endpoint_id, "GET", "/system/df");
        return okTruncated({ info, disk_usage: df });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_container_stats",
    "Einmalige Ressourcenstatistik (CPU, RAM, Netzwerk, I/O) eines Containers.",
    { endpoint_id: z.number(), container_id: z.string().regex(/^[A-Za-z0-9_.-]+$/) },
    async ({ endpoint_id, container_id }) => {
      try {
        return okTruncated(
          await client.dockerProxy(endpoint_id, "GET", `/containers/${container_id}/stats`, { stream: false, "one-shot": true }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_create_stack_from_git",
    "Compose-Stack aus einem Git-Repository anlegen (statt Inline-Compose). Zugangsdaten für private Repos optional.",
    {
      name: z.string(),
      endpoint_id: z.number(),
      repository_url: z.string().url(),
      reference: z.string().default("refs/heads/main"),
      compose_file: z.string().default("docker-compose.yml"),
      username: z.string().optional(),
      password: z.string().optional(),
      env: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      auto_update: z.boolean().default(false),
    },
    async (a) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return okTruncated(
          await client.createStackFromGit({
            name: a.name,
            endpointId: a.endpoint_id,
            repositoryURL: a.repository_url,
            repositoryReferenceName: a.reference,
            composeFile: a.compose_file,
            authentication: a.username && a.password ? { username: a.username, password: a.password } : undefined,
            env: a.env,
            autoUpdate: a.auto_update,
          }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "portainer_redeploy_stack_from_git",
    "Git-basierten Stack neu ausrollen (zieht das Repository neu, optional neue Images).",
    {
      stack_id: z.number(),
      endpoint_id: z.number(),
      pull_image: z.boolean().default(true),
      prune: z.boolean().default(false),
    },
    async ({ stack_id, endpoint_id, pull_image, prune }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return okTruncated(await client.redeployStackFromGit(stack_id, endpoint_id, pull_image, prune));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
