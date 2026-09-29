import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GithubClient } from "../clients/github.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Fehler: ${message}` }], isError: true };
}

export function registerGithubTools(server: McpServer, client: GithubClient, readOnly: boolean) {
  server.tool("github_whoami", "Den authentifizierten GitHub-Account abrufen (Token-Check).", {}, async () => {
    try {
      return ok(await client.getAuthenticatedUser());
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "github_list_repos",
    "Repositories auflisten – ohne 'owner' die des authentifizierten Accounts (inkl. privater), mit 'owner' die öffentlichen Repos eines beliebigen Users/einer Org.",
    { owner: z.string().optional().describe("GitHub-Benutzername oder Org, sonst der eigene Account"), per_page: z.number().optional() },
    async ({ owner, per_page }) => {
      try {
        return ok(await client.listRepos({ owner, per_page }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_search_repos",
    "Öffentliche (und mit Zugriff private) Repositories per GitHub-Suchsyntax durchsuchen, z.B. 'homeassistant-ai/ha-mcp' oder 'topic:home-assistant stars:>50'.",
    { query: z.string(), per_page: z.number().optional() },
    async ({ query, per_page }) => {
      try {
        return ok(await client.searchRepos(query, per_page));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("github_get_repo", "Details zu einem Repository abrufen (Beschreibung, Default-Branch, Sichtbarkeit, Stars, ...).", { owner: z.string(), repo: z.string() }, async ({ owner, repo }) => {
    try {
      return ok(await client.getRepo(owner, repo));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "github_create_repo",
    "Ein neues Repository anlegen (im eigenen Account oder, mit 'org', in einer Organisation).",
    {
      name: z.string(),
      description: z.string().optional(),
      private: z.boolean().optional().default(true),
      org: z.string().optional(),
      auto_init: z.boolean().optional().describe("Repo direkt mit einem initialen Commit (README) anlegen"),
    },
    async ({ name, description, private: isPrivate, org, auto_init }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createRepo({ name, description, private: isPrivate, org, auto_init }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_delete_repo",
    "Ein Repository UNWIDERRUFLICH löschen. Erfordert beim Token den Scope 'delete_repo'.",
    { owner: z.string(), repo: z.string() },
    async ({ owner, repo }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.deleteRepo(owner, repo));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool("github_list_branches", "Branches eines Repositories auflisten.", { owner: z.string(), repo: z.string() }, async ({ owner, repo }) => {
    try {
      return ok(await client.listBranches(owner, repo));
    } catch (e) {
      return fail(e);
    }
  });

  server.tool(
    "github_create_branch",
    "Einen neuen Branch von einem bestehenden Branch abzweigen.",
    { owner: z.string(), repo: z.string(), new_branch: z.string(), from_branch: z.string().default("main") },
    async ({ owner, repo, new_branch, from_branch }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createBranch(owner, repo, new_branch, from_branch));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_get_file",
    "Inhalt einer Datei aus einem Repository lesen (dekodiert als Text). Gibt null zurück, wenn die Datei nicht existiert.",
    { owner: z.string(), repo: z.string(), path: z.string(), ref: z.string().optional().describe("Branch/Tag/Commit-SHA, Standard: Default-Branch") },
    async ({ owner, repo, path, ref }) => {
      try {
        return ok(await client.getFileContents(owner, repo, path, ref));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_list_directory",
    "Inhalt eines Verzeichnisses in einem Repository auflisten.",
    { owner: z.string(), repo: z.string(), path: z.string().default(""), ref: z.string().optional() },
    async ({ owner, repo, path, ref }) => {
      try {
        return ok(await client.listDirectory(owner, repo, path, ref));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_create_or_update_file",
    "Eine Datei in einem Repository anlegen oder überschreiben (Upload/Änderung). Der aktuelle 'sha' wird bei einem Update automatisch ermittelt, falls nicht angegeben.",
    {
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      content: z.string().describe("Roher Dateiinhalt als Text (wird automatisch Base64-kodiert)"),
      message: z.string().describe("Commit-Message"),
      branch: z.string().optional().describe("Standard: Default-Branch des Repos"),
      sha: z.string().optional().describe("Nur nötig, wenn der sha der aktuellen Datei bereits bekannt ist"),
    },
    async ({ owner, repo, path, content, message, branch, sha }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createOrUpdateFile({ owner, repo, path, content, message, branch, sha }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_delete_file",
    "Eine Datei aus einem Repository löschen.",
    { owner: z.string(), repo: z.string(), path: z.string(), message: z.string(), branch: z.string().optional(), sha: z.string().optional() },
    async ({ owner, repo, path, message, branch, sha }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.deleteFile({ owner, repo, path, message, branch, sha }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_list_commits",
    "Commit-Historie eines Repositories (optional gefiltert nach Branch/Pfad) abrufen.",
    { owner: z.string(), repo: z.string(), branch: z.string().optional(), path: z.string().optional(), per_page: z.number().optional() },
    async ({ owner, repo, branch, path, per_page }) => {
      try {
        return ok(await client.listCommits(owner, repo, { branch, path, per_page }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_list_issues",
    "Issues eines Repositories auflisten.",
    { owner: z.string(), repo: z.string(), state: z.enum(["open", "closed", "all"]).optional().default("open") },
    async ({ owner, repo, state }) => {
      try {
        return ok(await client.listIssues(owner, repo, state));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_create_issue",
    "Ein neues Issue in einem Repository anlegen.",
    { owner: z.string(), repo: z.string(), title: z.string(), body: z.string().optional(), labels: z.array(z.string()).optional() },
    async ({ owner, repo, title, body, labels }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createIssue(owner, repo, title, body, labels));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_list_pull_requests",
    "Pull Requests eines Repositories auflisten.",
    { owner: z.string(), repo: z.string(), state: z.enum(["open", "closed", "all"]).optional().default("open") },
    async ({ owner, repo, state }) => {
      try {
        return ok(await client.listPullRequests(owner, repo, state));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_create_pull_request",
    "Einen neuen Pull Request erstellen.",
    { owner: z.string(), repo: z.string(), title: z.string(), head: z.string().describe("Quell-Branch, z.B. 'feature-x' oder 'user:branch' bei Forks"), base: z.string().describe("Ziel-Branch, z.B. 'main'"), body: z.string().optional() },
    async ({ owner, repo, title, head, base, body }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createPullRequest({ owner, repo, title, head, base, body }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_reset_branch_orphan",
    "GEFÄHRLICH – History-Squash: Setzt einen Branch auf einen einzigen frischen Root-Commit zurück (force). Löscht UNWIDERRUFLICH die komplette bisherige Commit-Historie des Branches (Stars/Issues/PRs/Repo-URL bleiben erhalten). Erwartet die VOLLSTÄNDIGE Ziel-Dateiliste – jede Datei, die danach im Repo existieren soll; alles was fehlt, verschwindet. Binärdateien (z.B. PNG) mit encoding='base64' übergeben.",
    {
      owner: z.string(),
      repo: z.string(),
      branch: z.string().default("main"),
      message: z.string(),
      files: z.array(
        z.object({
          path: z.string(),
          content: z.string().describe("Text-Inhalt, oder Base64 bei encoding='base64'"),
          encoding: z.enum(["utf-8", "base64"]).optional().default("utf-8"),
        }),
      ),
    },
    async ({ owner, repo, branch, message, files }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.resetBranchOrphan({ owner, repo, branch, message, files }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  // -- Git Data API (granular, low-level) -----------------------------------
  // Für Fälle, in denen github_reset_branch_orphan als einzelner Aufruf zu
  // groß wird (z.B. viele/große Dateien): dieselben Schritte einzeln.

  server.tool(
    "github_create_blob",
    "Git-Data-API: Einen einzelnen Blob (Dateiinhalt) anlegen und dessen sha zurückgeben. Für Binärdateien encoding='base64' nutzen.",
    { owner: z.string(), repo: z.string(), content: z.string(), encoding: z.enum(["utf-8", "base64"]).optional().default("utf-8") },
    async ({ owner, repo, content, encoding }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createBlob(owner, repo, content, encoding));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_create_tree",
    "Git-Data-API: Einen Tree aus Einträgen anlegen (Eintrag entweder mit 'sha' eines vorhandenen Blobs oder direkt mit 'content' als Text).",
    {
      owner: z.string(),
      repo: z.string(),
      base_tree: z.string().optional(),
      tree: z.array(
        z.object({
          path: z.string(),
          mode: z.string().optional().default("100644"),
          type: z.string().optional().default("blob"),
          sha: z.string().optional(),
          content: z.string().optional(),
        }),
      ),
    },
    async ({ owner, repo, base_tree, tree }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createTree(owner, repo, tree, base_tree));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_create_commit",
    "Git-Data-API: Einen Commit-Objekt anlegen (parents=[] für einen Root-Commit).",
    { owner: z.string(), repo: z.string(), message: z.string(), tree: z.string(), parents: z.array(z.string()).default([]) },
    async ({ owner, repo, message, tree, parents }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.createCommit(owner, repo, message, tree, parents));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.tool(
    "github_update_ref",
    "Git-Data-API: Eine Ref (z.B. 'heads/main') auf einen Commit-sha setzen. force=true überschreibt die bisherige Historie (nicht umkehrbar).",
    { owner: z.string(), repo: z.string(), ref: z.string().describe("z.B. 'heads/main'"), sha: z.string(), force: z.boolean().optional().default(false) },
    async ({ owner, repo, ref, sha, force }) => {
      if (readOnly) return fail("Server läuft im READ_ONLY-Modus.");
      try {
        return ok(await client.updateRef(owner, repo, ref, sha, force));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
