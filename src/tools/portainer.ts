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
}
