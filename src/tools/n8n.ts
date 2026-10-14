import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { N8nClient } from "../clients/n8n.js";
import { genericApiShape, makeTool } from "./common.js";

export function registerN8nTools(server: McpServer, client: N8nClient, readOnly: boolean, counter?: { count: number }) {
  const tool = makeTool(server, readOnly, counter);
  const cursor = z.string().optional().describe("Cursor für die nächste Seite (aus nextCursor)");
  const limit = z.number().int().default(50);

  // Workflows
  tool(
    "n8n_list_workflows",
    "n8n: Workflows auflisten.",
    { active: z.boolean().optional(), name: z.string().optional(), tags: z.string().optional().describe("Komma-getrennte Tag-Namen"), limit, cursor },
    false,
    (a) => client.api("/workflows", { query: { ...a, excludePinnedData: true } }),
  );
  tool("n8n_get_workflow", "n8n: Einen Workflow komplett abrufen (Nodes, Verbindungen).", { id: z.string() }, false, ({ id }) =>
    client.api(`/workflows/${id}`),
  );
  tool(
    "n8n_create_workflow",
    "n8n: Workflow anlegen. Erwartet name, nodes, connections und settings (siehe n8n_get_workflow).",
    { workflow: z.record(z.any()) },
    true,
    ({ workflow }) => client.api("/workflows", { method: "POST", body: workflow }),
  );
  tool(
    "n8n_update_workflow",
    "n8n: Workflow ersetzen (komplettes Objekt mit name, nodes, connections, settings).",
    { id: z.string(), workflow: z.record(z.any()) },
    true,
    ({ id, workflow }) => client.api(`/workflows/${id}`, { method: "PUT", body: workflow }),
  );
  tool("n8n_delete_workflow", "n8n: Workflow löschen.", { id: z.string() }, true, ({ id }) => client.api(`/workflows/${id}`, { method: "DELETE" }));
  tool("n8n_activate_workflow", "n8n: Workflow aktivieren.", { id: z.string() }, true, ({ id }) =>
    client.api(`/workflows/${id}/activate`, { method: "POST" }),
  );
  tool("n8n_deactivate_workflow", "n8n: Workflow deaktivieren.", { id: z.string() }, true, ({ id }) =>
    client.api(`/workflows/${id}/deactivate`, { method: "POST" }),
  );
  tool("n8n_get_workflow_tags", "n8n: Tags eines Workflows.", { id: z.string() }, false, ({ id }) => client.api(`/workflows/${id}/tags`));
  tool("n8n_set_workflow_tags", "n8n: Tags eines Workflows setzen (Liste von Tag-IDs).", { id: z.string(), tag_ids: z.array(z.string()) }, true, ({ id, tag_ids }) =>
    client.api(`/workflows/${id}/tags`, { method: "PUT", body: tag_ids.map((t) => ({ id: t })) }),
  );
  tool(
    "n8n_trigger_webhook",
    "n8n: Webhook-Trigger eines Workflows aufrufen (Pfad aus dem Webhook-Node). test=true nutzt die Test-URL.",
    { path: z.string(), method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"), body: z.any().optional(), test: z.boolean().default(false) },
    true,
    ({ path, method, body, test }) => client.webhook(path, method, body, test),
  );

  // Ausführungen
  tool(
    "n8n_list_executions",
    "n8n: Ausführungen auflisten.",
    { workflow_id: z.string().optional(), status: z.enum(["error", "success", "waiting", "running", "canceled"]).optional(), include_data: z.boolean().default(false), limit, cursor },
    false,
    ({ workflow_id, status, include_data, limit, cursor }) =>
      client.api("/executions", { query: { workflowId: workflow_id, status, includeData: include_data, limit, cursor } }),
  );
  tool("n8n_get_execution", "n8n: Eine Ausführung inkl. Daten abrufen.", { id: z.string(), include_data: z.boolean().default(true) }, false, ({ id, include_data }) =>
    client.api(`/executions/${id}`, { query: { includeData: include_data } }),
  );
  tool("n8n_delete_execution", "n8n: Ausführung löschen.", { id: z.string() }, true, ({ id }) => client.api(`/executions/${id}`, { method: "DELETE" }));
  tool("n8n_retry_execution", "n8n: Fehlgeschlagene Ausführung erneut starten.", { id: z.string(), load_latest_workflow: z.boolean().default(false) }, true, ({ id, load_latest_workflow }) =>
    client.api(`/executions/${id}/retry`, { method: "POST", body: { loadWorkflow: load_latest_workflow } }),
  );

  // Credentials
  tool("n8n_get_credential_schema", "n8n: Schema (benötigte Felder) eines Zugangsdaten-Typs, z. B. 'httpBasicAuth'.", { credential_type: z.string() }, false, ({ credential_type }) =>
    client.api(`/credentials/schema/${credential_type}`),
  );
  tool(
    "n8n_create_credential",
    "n8n: Zugangsdaten anlegen (name, type, data gemäß Schema).",
    { name: z.string(), type: z.string(), data: z.record(z.any()) },
    true,
    ({ name, type, data }) => client.api("/credentials", { method: "POST", body: { name, type, data } }),
  );
  tool("n8n_delete_credential", "n8n: Zugangsdaten löschen.", { id: z.string() }, true, ({ id }) => client.api(`/credentials/${id}`, { method: "DELETE" }));

  // Tags
  tool("n8n_list_tags", "n8n: Alle Tags.", { limit, cursor }, false, ({ limit, cursor }) => client.api("/tags", { query: { limit, cursor } }));
  tool("n8n_create_tag", "n8n: Tag anlegen.", { name: z.string() }, true, ({ name }) => client.api("/tags", { method: "POST", body: { name } }));
  tool("n8n_update_tag", "n8n: Tag umbenennen.", { id: z.string(), name: z.string() }, true, ({ id, name }) =>
    client.api(`/tags/${id}`, { method: "PUT", body: { name } }),
  );
  tool("n8n_delete_tag", "n8n: Tag löschen.", { id: z.string() }, true, ({ id }) => client.api(`/tags/${id}`, { method: "DELETE" }));

  // Variablen
  tool("n8n_list_variables", "n8n: Variablen.", { limit, cursor }, false, ({ limit, cursor }) => client.api("/variables", { query: { limit, cursor } }));
  tool("n8n_create_variable", "n8n: Variable anlegen.", { key: z.string(), value: z.string() }, true, ({ key, value }) =>
    client.api("/variables", { method: "POST", body: { key, value } }),
  );
  tool("n8n_update_variable", "n8n: Variable ändern.", { id: z.string(), key: z.string(), value: z.string() }, true, ({ id, key, value }) =>
    client.api(`/variables/${id}`, { method: "PUT", body: { key, value } }),
  );
  tool("n8n_delete_variable", "n8n: Variable löschen.", { id: z.string() }, true, ({ id }) => client.api(`/variables/${id}`, { method: "DELETE" }));

  // Benutzer & Projekte
  tool("n8n_list_users", "n8n: Benutzer.", { limit, cursor, include_role: z.boolean().default(true) }, false, ({ limit, cursor, include_role }) =>
    client.api("/users", { query: { limit, cursor, includeRole: include_role } }),
  );
  tool("n8n_invite_users", "n8n: Benutzer einladen (Liste aus {email, role}).", { users: z.array(z.object({ email: z.string(), role: z.string().default("global:member") })) }, true, ({ users }) =>
    client.api("/users", { method: "POST", body: users }),
  );
  tool("n8n_delete_user", "n8n: Benutzer löschen.", { id: z.string() }, true, ({ id }) => client.api(`/users/${id}`, { method: "DELETE" }));
  tool("n8n_change_user_role", "n8n: Rolle eines Benutzers ändern.", { id: z.string(), role: z.string().describe("z. B. global:admin oder global:member") }, true, ({ id, role }) =>
    client.api(`/users/${id}/role`, { method: "PATCH", body: { newRoleName: role } }),
  );
  tool("n8n_list_projects", "n8n: Projekte.", { limit, cursor }, false, ({ limit, cursor }) => client.api("/projects", { query: { limit, cursor } }));
  tool("n8n_create_project", "n8n: Projekt anlegen.", { name: z.string() }, true, ({ name }) => client.api("/projects", { method: "POST", body: { name } }));
  tool("n8n_delete_project", "n8n: Projekt löschen.", { id: z.string() }, true, ({ id }) => client.api(`/projects/${id}`, { method: "DELETE" }));

  // System
  tool("n8n_audit", "n8n: Sicherheits-Audit erzeugen.", { categories: z.array(z.string()).optional() }, true, ({ categories }) =>
    client.api("/audit", { method: "POST", body: categories ? { additionalOptions: { categories } } : {} }),
  );
  tool("n8n_source_control_pull", "n8n: Änderungen aus dem Git-Repository ziehen (Source Control).", { force: z.boolean().default(false) }, true, ({ force }) =>
    client.api("/source-control/pull", { method: "POST", body: { force } }),
  );
  tool(
    "n8n_api",
    "n8n: Generalschlüssel – beliebiger Aufruf der n8n Public API (Pfad ab /api/v1, z. B. /workflows). GET frei, alles andere nur ohne READ_ONLY.",
    genericApiShape,
    (a) => a.method !== "GET",
    ({ method, path, query, body }) => client.api(path, { method, query, body }),
  );
}
