# TheBoringMCP – Add-on Documentation

🇬🇧 **[English](#english)** · 🇩🇪 **[Deutsch](#deutsch)**

---

## English

### What does this add-on do?

It starts an [MCP](https://modelcontextprotocol.io) server (Model Context
Protocol) that gives Claude (or any other MCP-capable client) **full
access** to the following systems:

- **Home Assistant** – read/set states, call any service, create, change,
  and delete automations/scripts/scenes, restart Core, read logs &
  history, plus (via an additional WebSocket connection, using the same
  URL/token) Areas/Floors/Labels/Categories, device & entity registry,
  helpers, dashboards, calendar, to-do lists, integrations, energy
  preferences, Assist pipelines, backups, blueprints, and more.
- **Portainer** – environments, containers (create, start, stop, restart,
  delete), images (pull, delete), stacks (create, update, delete
  Compose).
- **Sonarr / Radarr** – search, add, and delete series/movies, manage the
  queue, trigger manual searches.
- **SABnzbd** – queue & history, pause/resume, add downloads.
- **Jellyfin** – browse the library, control sessions, trigger scans.
- **Plex** – browse libraries, trigger scans, edit metadata, mark items as
  watched/unwatched, cancel playback sessions, empty trash, delete items.
- **GitHub** – check/search repositories, read branches & files, create,
  change, and delete files (upload), list and create commits/issues/pull
  requests, create repos.

Every service is **optional**: if you don't enter a Portainer URL, for
example, the Portainer tools simply aren't offered.

### Setup

1. **Home Assistant**: By default `homeassistant_api: true` is enabled,
   and the add-on automatically receives a Supervisor token with access
   to the Core API – you don't need to enter anything. If you want to
   address an external HA instance instead, enter `ha_url` and a
   Long-Lived Access Token under `ha_token`.
2. **Portainer**: `portainer_url` (e.g. `https://192.168.1.11:9444`) and
   an API key from *My Account -> Access Tokens* under
   `portainer_api_key`. `portainer_insecure_tls` defaults to `true`
   because Portainer usually uses a self-signed certificate on home
   networks – switch to `false` once a valid/trusted certificate is in
   place.
3. **Sonarr/Radarr/SABnzbd/Jellyfin**: URL + API key from the respective
   app's settings.
4. **GitHub**: enter a Personal Access Token (fine-grained, scoped to the
   desired repos, or classic with the `repo` scope) under `github_token`.
   `github_api_url` is only needed for GitHub Enterprise Server (default:
   `https://api.github.com`).
5. **Plex**: enter `plex_url` (e.g. `http://192.168.1.5:32400`) and your
   `X-Plex-Token` under `plex_token`. You can find the token e.g. via the
   Plex web app: open any media item -> "..." -> "Get Info" -> "View
   XML" -> the URL contains `X-Plex-Token=...` (see also the
   [official guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)).
6. **mcp_http_token** (required): a self-chosen, long random password.
   The MCP server is reachable via HTTP on port `17820` – every request
   needs the header `Authorization: Bearer <mcp_http_token>`. **Without
   this token, anyone on the network would have full access to all the
   systems listed above.**
7. Optional: `read_only: true` disables all writing/controlling tools
   (read-only access).

### Connecting Claude

Since the Home Assistant extension (~80 HA tools via the WebSocket API),
a single MCP server with all services would exceed Claude connectors'
100-tool limit – anything beyond that is silently cut off by the
connector. That's why the server offers two paths, set up as **two
separate connectors** (both using the same token):

| Connector | URL | Contains |
|---|---|---|
| TheBoringMCP-HA | `http://<home-assistant-ip>:17820/` | Home Assistant (~80 tools) |
| TheBoringMCP-Rest | `http://<home-assistant-ip>:17820/rest` | Portainer, Sonarr, Radarr, SABnzbd, Jellyfin, Plex, GitHub (~90 tools) |

For both: **Header**: `Authorization: Bearer <your mcp_http_token>`

### Security notice

This add-on grants full, unfiltered write access to Home Assistant and
Portainer. Be sure to set a strong `mcp_http_token`, don't expose the
port directly to the internet without a reverse proxy with TLS, and use
`read_only: true` if you only want to build reports/dashboards.

---

## Deutsch

### Was macht dieses Add-on?

Es startet einen [MCP](https://modelcontextprotocol.io)-Server (Model Context
Protocol), über den Claude (oder ein anderer MCP-fähiger Client) **vollen
Zugriff** auf folgende Systeme bekommt:

- **Home Assistant** – Zustände lesen/setzen, beliebige Services aufrufen,
  Automationen/Skripte/Szenen anlegen, ändern, löschen, Core neu starten,
  Logs & History auslesen, sowie (über eine zusätzliche
  WebSocket-Verbindung, nutzt dieselbe URL/Token) Areas/Floors/Labels/
  Categories, Geräte- & Entity-Registry, Helper, Dashboards, Kalender,
  To-do-Listen, Integrationen, Energie-Prefs, Assist-Pipelines, Backups,
  Blueprints und mehr.
- **Portainer** – Environments, Container (erstellen, starten, stoppen,
  neu starten, löschen), Images (pullen, löschen), Stacks (Compose anlegen,
  aktualisieren, löschen).
- **Sonarr / Radarr** – Serien/Filme suchen, hinzufügen, löschen, Queue
  verwalten, manuelle Suche anstoßen.
- **SABnzbd** – Queue & Historie, pausieren/fortsetzen, Downloads hinzufügen.
- **Jellyfin** – Bibliothek durchsuchen, Sessions steuern, Scans anstoßen.
- **Plex** – Bibliotheken durchsuchen, Scans anstoßen, Metadaten bearbeiten,
  Elemente als angesehen/unangesehen markieren, Wiedergabe-Sessions
  abbrechen, Papierkorb leeren, Elemente löschen.
- **GitHub** – Repositories prüfen/durchsuchen, Branches & Dateien lesen,
  Dateien anlegen/ändern/löschen (Upload), Commits/Issues/Pull-Requests
  auflisten und erstellen, Repos anlegen.

Jeder Dienst ist **optional**: Trägst du z.B. keine Portainer-URL ein, werden
die Portainer-Tools einfach nicht angeboten.

### Einrichtung

1. **Home Assistant**: Standardmäßig ist `homeassistant_api: true` aktiv,
   das Add-on bekommt automatisch einen Supervisor-Token mit Zugriff auf die
   Core-API – du musst nichts eintragen. Willst du stattdessen eine externe
   HA-Instanz ansprechen, trage `ha_url` und ein Long-Lived Access Token
   unter `ha_token` ein.
2. **Portainer**: `portainer_url` (z.B. `https://192.168.1.11:9444`) und
   einen API-Key aus *My Account -> Access Tokens* unter `portainer_api_key`.
   `portainer_insecure_tls` ist standardmäßig `true`, weil Portainer im
   Heimnetz meist ein selbstsigniertes Zertifikat nutzt – auf `false`
   umstellen, sobald ein gültiges/vertrauenswürdiges Zertifikat vorliegt.
3. **Sonarr/Radarr/SABnzbd/Jellyfin**: jeweils URL + API-Key aus den
   Einstellungen der jeweiligen App.
4. **GitHub**: einen Personal Access Token (fine-grained, mit Zugriff auf die
   gewünschten Repos, oder classic mit `repo`-Scope) unter `github_token`
   eintragen. `github_api_url` nur für GitHub Enterprise Server nötig
   (Standard: `https://api.github.com`).
5. **Plex**: `plex_url` (z.B. `http://192.168.1.5:32400`) und deinen
   `X-Plex-Token` unter `plex_token` eintragen. Den Token findest du z.B.
   über die Plex-Web-App: ein beliebiges Medienelement öffnen -> "..." ->
   "Info abrufen" -> "XML anzeigen" -> in der URL steht `X-Plex-Token=...`
   (siehe auch die [offizielle Anleitung](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)).
6. **mcp_http_token** (Pflichtfeld): ein selbst gewähltes, langes zufälliges
   Passwort. Der MCP-Server ist per HTTP auf Port `17820` erreichbar –
   jeder Request braucht den Header `Authorization: Bearer <mcp_http_token>`.
   **Ohne dieses Token hätte jeder im Netzwerk vollen Zugriff auf alle
   oben genannten Systeme.**
7. Optional: `read_only: true` deaktiviert alle schreibenden/steuernden
   Tools (nur Lesezugriff).

### Claude anbinden

Seit der Home-Assistant-Erweiterung (~80 HA-Tools über die WebSocket-API)
würde ein einzelner MCP-Server mit allen Diensten das 100-Tool-Limit von
Claude-Connectoren reißen – alles darüber wird vom Connector kommentarlos
abgeschnitten. Deshalb bietet der Server zwei Pfade an, die als **zwei
separate Connectoren** angelegt werden (beide mit demselben Token):

| Connector | URL | Enthält |
|---|---|---|
| TheBoringMCP-HA | `http://<home-assistant-ip>:17820/` | Home Assistant (~80 Tools) |
| TheBoringMCP-Rest | `http://<home-assistant-ip>:17820/rest` | Portainer, Sonarr, Radarr, SABnzbd, Jellyfin, Plex, GitHub (~90 Tools) |

Für beide: **Header**: `Authorization: Bearer <dein mcp_http_token>`

### Sicherheitshinweis

Dieses Add-on gibt vollen, ungefilterten Schreibzugriff auf Home Assistant
und Portainer. Setze unbedingt ein starkes `mcp_http_token`, exponiere den
Port nicht direkt ins Internet ohne Reverse Proxy mit TLS, und nutze
`read_only: true`, falls du nur Auswertungen/Dashboards bauen willst.
