import { request, HttpError } from "./http.js";
import type { GithubConfig } from "../config.js";

/**
 * GitHub REST API (v3, `application/vnd.github+json`).
 *
 * Auth per Personal Access Token (fine-grained oder classic) oder GitHub-
 * App-Installationstoken – alle akzeptieren `Authorization: Bearer <token>`.
 */
export class GithubClient {
  constructor(private readonly cfg: GithubConfig) {}

  private api<T>(path: string, opts: Parameters<typeof request>[2] = {}) {
    return request<T>(this.cfg.baseUrl, path, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.headers ?? {}),
      },
    });
  }

  // -- Repos --------------------------------------------------------------

  getAuthenticatedUser() {
    return this.api<Record<string, unknown>>("/user");
  }

  listRepos(opts: { owner?: string; type?: "all" | "owner" | "member"; per_page?: number } = {}) {
    if (opts.owner) {
      return this.api<Array<Record<string, unknown>>>(`/users/${opts.owner}/repos`, {
        query: { per_page: opts.per_page ?? 30 },
      });
    }
    return this.api<Array<Record<string, unknown>>>("/user/repos", {
      query: { type: opts.type ?? "owner", per_page: opts.per_page ?? 30, sort: "updated" },
    });
  }

  searchRepos(query: string, per_page = 20) {
    return this.api<Record<string, unknown>>("/search/repositories", { query: { q: query, per_page } });
  }

  getRepo(owner: string, repo: string) {
    return this.api<Record<string, unknown>>(`/repos/${owner}/${repo}`);
  }

  createRepo(opts: { name: string; description?: string; private?: boolean; org?: string; auto_init?: boolean }) {
    const { org, ...body } = opts;
    const path = org ? `/orgs/${org}/repos` : "/user/repos";
    return this.api(path, { method: "POST", body });
  }

  deleteRepo(owner: string, repo: string) {
    return this.api(`/repos/${owner}/${repo}`, { method: "DELETE" });
  }

  // -- Inhalte / Dateien ----------------------------------------------------

  listBranches(owner: string, repo: string) {
    return this.api<Array<Record<string, unknown>>>(`/repos/${owner}/${repo}/branches`, { query: { per_page: 100 } });
  }

  createBranch(owner: string, repo: string, newBranch: string, fromBranch: string) {
    return this.getRef(owner, repo, `heads/${fromBranch}`).then((ref) => {
      const sha = (ref as { object: { sha: string } }).object.sha;
      return this.api(`/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${newBranch}`, sha },
      });
    });
  }

  private getRef(owner: string, repo: string, ref: string) {
    return this.api<Record<string, unknown>>(`/repos/${owner}/${repo}/git/ref/${ref}`);
  }

  /** Gibt den Dateiinhalt (Base64-dekodiert als Text) und den `sha` zurück, oder `null`, wenn die Datei nicht existiert. */
  async getFileContents(owner: string, repo: string, path: string, ref?: string) {
    try {
      const result = await this.api<{ content?: string; encoding?: string; sha: string; [key: string]: unknown }>(
        `/repos/${owner}/${repo}/contents/${path}`,
        { query: { ref } },
      );
      if (result.content && result.encoding === "base64") {
        return { ...result, decoded: Buffer.from(result.content, "base64").toString("utf8") };
      }
      return { ...result, decoded: null };
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  listDirectory(owner: string, repo: string, path: string, ref?: string) {
    return this.api<Array<Record<string, unknown>>>(`/repos/${owner}/${repo}/contents/${path}`, { query: { ref } });
  }

  /**
   * Datei anlegen oder aktualisieren. Ermittelt den aktuellen `sha` automatisch
   * (nötig für ein Update), sofern nicht explizit übergeben.
   */
  async createOrUpdateFile(opts: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch?: string;
    sha?: string;
  }) {
    let sha = opts.sha;
    if (!sha) {
      const existing = await this.getFileContents(opts.owner, opts.repo, opts.path, opts.branch);
      sha = existing?.sha;
    }
    return this.api(`/repos/${opts.owner}/${opts.repo}/contents/${opts.path}`, {
      method: "PUT",
      body: {
        message: opts.message,
        content: Buffer.from(opts.content, "utf8").toString("base64"),
        branch: opts.branch,
        sha,
      },
    });
  }

  async deleteFile(opts: { owner: string; repo: string; path: string; message: string; branch?: string; sha?: string }) {
    let sha = opts.sha;
    if (!sha) {
      const existing = await this.getFileContents(opts.owner, opts.repo, opts.path, opts.branch);
      if (!existing) throw new Error(`Datei ${opts.path} nicht gefunden – kann nicht gelöscht werden.`);
      sha = existing.sha;
    }
    return this.api(`/repos/${opts.owner}/${opts.repo}/contents/${opts.path}`, {
      method: "DELETE",
      body: { message: opts.message, sha, branch: opts.branch },
    });
  }

  listCommits(owner: string, repo: string, opts: { branch?: string; path?: string; per_page?: number } = {}) {
    return this.api<Array<Record<string, unknown>>>(`/repos/${owner}/${repo}/commits`, {
      query: { sha: opts.branch, path: opts.path, per_page: opts.per_page ?? 20 },
    });
  }

  // -- Issues / PRs ---------------------------------------------------------

  listIssues(owner: string, repo: string, state: "open" | "closed" | "all" = "open") {
    return this.api<Array<Record<string, unknown>>>(`/repos/${owner}/${repo}/issues`, {
      query: { state, per_page: 50 },
    });
  }

  createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]) {
    return this.api(`/repos/${owner}/${repo}/issues`, { method: "POST", body: { title, body, labels } });
  }

  listPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "open") {
    return this.api<Array<Record<string, unknown>>>(`/repos/${owner}/${repo}/pulls`, {
      query: { state, per_page: 50 },
    });
  }

  createPullRequest(opts: { owner: string; repo: string; title: string; head: string; base: string; body?: string }) {
    return this.api(`/repos/${opts.owner}/${opts.repo}/pulls`, {
      method: "POST",
      body: { title: opts.title, head: opts.head, base: opts.base, body: opts.body },
    });
  }

  // -- Git Data API (Low-Level: Blobs/Trees/Commits/Refs) --------------------
  //
  // Wird für den Orphan-Commit-Reset (History-Squash) gebraucht; die Contents-
  // API oben kann nur einzelne, aufeinander aufbauende Commits anlegen.

  createBlob(owner: string, repo: string, content: string, encoding: "utf-8" | "base64" = "utf-8") {
    return this.api<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: { content, encoding },
    });
  }

  createTree(
    owner: string,
    repo: string,
    tree: Array<{ path: string; mode: string; type: string; sha?: string | null; content?: string }>,
    base_tree?: string,
  ) {
    return this.api<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      body: { tree, base_tree },
    });
  }

  createCommit(owner: string, repo: string, message: string, tree: string, parents: string[]) {
    return this.api<{ sha: string }>(`/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      body: { message, tree, parents },
    });
  }

  updateRef(owner: string, repo: string, ref: string, sha: string, force = false) {
    return this.api(`/repos/${owner}/${repo}/git/refs/${ref}`, {
      method: "PATCH",
      body: { sha, force },
    });
  }

  /**
   * Setzt einen Branch auf einen einzigen frischen Root-Commit zurück
   * (History-Squash/-Reset). Erwartet die VOLLSTÄNDIGE Ziel-Dateiliste
   * (alles, was danach im Repo existieren soll); alles andere verschwindet.
   * Binärdateien mit `encoding: "base64"` übergeben.
   *
   * ACHTUNG: force-überschreibt die komplette bisherige Commit-Historie des
   * Branches – nicht umkehrbar (Sterne/Issues/PRs/Repo-URL bleiben erhalten,
   * nur die Commit-Historie wird ersetzt).
   */
  async resetBranchOrphan(opts: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: Array<{ path: string; content: string; encoding?: "utf-8" | "base64" }>;
  }) {
    const treeEntries: Array<{ path: string; mode: string; type: string; sha?: string; content?: string }> = [];
    for (const f of opts.files) {
      if (f.encoding === "base64") {
        const blob = await this.createBlob(opts.owner, opts.repo, f.content, "base64");
        treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
      } else {
        treeEntries.push({ path: f.path, mode: "100644", type: "blob", content: f.content });
      }
    }
    const tree = await this.createTree(opts.owner, opts.repo, treeEntries);
    const commit = await this.createCommit(opts.owner, opts.repo, opts.message, tree.sha, []);
    await this.updateRef(opts.owner, opts.repo, `heads/${opts.branch}`, commit.sha, true);
    return { commit: commit.sha, tree: tree.sha, files: opts.files.length };
  }
}
