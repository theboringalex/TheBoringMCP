# TheBoringMCP

[![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftheboringalex%2FTheBoringMCP)

<a href="https://www.buymeacoffee.com/theboringit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

🇬🇧 **[English](#english)** · 🇩🇪 **[Deutsch](#deutsch)**

---

## English

A single [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server with **full access** to your HomeLab: Home Assistant, Portainer, Sonarr, Radarr, SABnzbd, Jellyfin, Plex and GitHub – usable directly from Claude.

Built because everyday HomeLab chores should be too boring to still bother doing yourself. Hence the name.

**New here?** The complete, easy-to-follow step-by-step guide (incl. optionally installing NGINX Proxy Manager & Portainer) is in [INSTALL.md](INSTALL.md).

### Features

| Service | Tool prefix | Examples |
|---|---|---|
| Home Assistant | `ha_*` | Read/set states, `ha_call_service` (any domain/any service), create & delete automations/scripts/scenes, restart Core, history/logbook, render Jinja templates, **plus (since 0.4.0) registry/storage access via the WebSocket API**: areas/floors/labels/categories, device & entity registry, helpers (input_\*, counter, timer, schedule, zone, person, tag), legacy groups, dashboards & resources, calendar events, to-do lists, config entries/integrations, energy prefs, assist pipelines, automation traces, bulk control over area/floor, camera images, events, backups, blueprints, (best effort) HACS, themes, ZHA/Z-Wave JS |
| Portainer | `portainer_*` | Environments, create/start/stop/delete containers, pull/delete images, create/update/delete compose stacks |
| Sonarr | `sonarr_*` | Search & add series, manage queue, calendar, manual search |
| Radarr | `radarr_*` | Search & add movies, manage queue, calendar, manual search |
| SABnzbd | `sabnzbd_*` | Queue/history, pause/resume, add downloads |
| Jellyfin | `jellyfin_*` | Browse library, control sessions, trigger scans |
| Plex | `plex_*` | Browse libraries, trigger scans, edit metadata, mark as watched/unwatched, terminate sessions, delete items |
| GitHub | `github_*` | Check/search/create repos, branches, read/create/update/delete files, commits, issues & pull requests |

Every service is **individually optional** – if the configuration for a service is missing, its tools simply aren't registered at startup (see the console log on start).

The reference project for the Home Assistant part is
[homeassistant-ai/ha-mcp](https://github.com/homeassistant-ai/ha-mcp);
TheBoringMCP additionally bundles Portainer and the ARR stack into one
server instead of having to run several MCP servers in parallel. Since
0.4.0, the HA part (via its own WebSocket client implementation,
`src/clients/homeassistant-ws.ts`) largely matches `ha-mcp` in content –
deliberately excluded are its server-internal meta tools
(`ha_get_skill_guide`, `ha_get_operation_status`, `ha_report_issue`),
which aren't real HA permissions but docs/job-queue/issue-filing for the
`ha-mcp` codebase itself.

### Operating Modes

TheBoringMCP supports two transport modes:

1. **stdio** (default) – for local use, e.g. with Claude Desktop or
   Claude Code, where the process is started directly by the client.
2. **HTTP (Streamable)** – for always-on operation as a container/add-on
   that Claude reaches via URL (`TRANSPORT=http`).

#### 1) As a Home Assistant Add-on

1. In Home Assistant: *Settings -> Add-ons -> Add-on Store -> ⋮ ->
   Repositories* -> enter this repo's URL.
2. Install "TheBoringMCP", fill in the options (see [DOCS.md](DOCS.md)),
   start it.
3. Create **two Claude connectors** (both with the same
   `Authorization: Bearer <mcp_http_token>` header), since a single
   MCP server would otherwise exceed Claude connectors' 100-tool limit
   because of the Home Assistant extension (~80 tools):
   - `http://<ha-ip>:17820/` -> Home Assistant only
   - `http://<ha-ip>:17820/rest` -> Portainer, Sonarr, Radarr, SABnzbd,
     Jellyfin, Plex, GitHub

#### 2) As a standalone Docker container

```bash
git clone https://github.com/theboringalex/TheBoringMCP.git
cd TheBoringMCP
cp docker-compose.yml docker-compose.local.yml   # optional, adjust values
docker compose up -d --build
```

The server then runs at `http://<host>:17820/` (Home Assistant) and
`http://<host>:17820/rest` (all other services) – see the note on the
100-tool limit above.

#### 3) Locally via stdio (Claude Desktop / Claude Code)

```bash
git clone https://github.com/theboringalex/TheBoringMCP.git
cd TheBoringMCP
npm install
npm run build
```

In your Claude Desktop configuration (`claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "theboringmcp": {
      "command": "node",
      "args": ["/path/to/TheBoringMCP/dist/index.js"],
      "env": {
        "HA_URL": "http://192.168.1.11:8123",
        "HA_TOKEN": "...",
        "PORTAINER_URL": "https://192.168.1.11:9444",
        "PORTAINER_API_KEY": "...",
        "SONARR_URL": "http://192.168.1.5:8989",
        "SONARR_API_KEY": "...",
        "RADARR_URL": "http://192.168.1.5:7878",
        "RADARR_API_KEY": "...",
        "SABNZBD_URL": "http://192.168.1.5:6554",
        "SABNZBD_API_KEY": "...",
        "JELLYFIN_URL": "http://192.168.1.5:8096",
        "JELLYFIN_API_KEY": "...",
        "GITHUB_TOKEN": "...",
        "PLEX_URL": "http://192.168.1.5:32400",
        "PLEX_TOKEN": "..."
      }
    }
  }
}
```

### Configuration (Environment Variables)

All variables are optional – only the variables set for the services you
want are activated.

| Variable | Description |
|---|---|
| `HA_URL`, `HA_TOKEN` | Home Assistant base URL + Long-Lived Access Token |
| `PORTAINER_URL`, `PORTAINER_API_KEY` | Portainer URL + API key (*My Account -> Access Tokens*) |
| `PORTAINER_USERNAME`, `PORTAINER_PASSWORD` | Alternative to API key: login credentials |
| `PORTAINER_INSECURE_TLS` | Default `true`: accepts Portainer's self-signed TLS certificate (typical on a home network). Set to `false` once a valid/trusted certificate is in place |
| `SONARR_URL`, `SONARR_API_KEY` | Sonarr URL + API key (*Settings -> General*) |
| `RADARR_URL`, `RADARR_API_KEY` | Radarr URL + API key |
| `SABNZBD_URL`, `SABNZBD_API_KEY` | SABnzbd URL + API key |
| `JELLYFIN_URL`, `JELLYFIN_API_KEY` | Jellyfin URL + API key (*Dashboard -> API Keys*) |
| `GITHUB_TOKEN` | Personal Access Token (fine-grained or classic with `repo` scope) |
| `GITHUB_API_URL` | Only for GitHub Enterprise Server (default: `https://api.github.com`) |
| `PLEX_URL`, `PLEX_TOKEN` | Plex Media Server URL + `X-Plex-Token` (see [guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)) |
| `READ_ONLY` | `true` disables all writing/controlling tools |
| `TRANSPORT` | `stdio` (default) or `http` |
| `PORT` | HTTP port in `http` mode (default `17820`) |
| `MCP_HTTP_TOKEN` | Bearer token required for every request in `http` mode |

### Security

TheBoringMCP grants **full, unfiltered access** – including deleting
containers, automations, movies/shows and more. In HTTP mode **always**
set `MCP_HTTP_TOKEN` and don't expose the port to the internet without a
reverse proxy/TLS. For pure reporting/dashboards, use `READ_ONLY=true`.

### Development

```bash
npm install
npm run dev     # tsx watch – restarts on code changes
npm run build   # -> dist/
npm run lint    # tsc --noEmit
```

Project structure:

```
src/
  clients/     # One API client per service (HTTP only, no MCP logic)
  tools/       # MCP tool definitions per service (zod schemas + handler)
  config.ts    # Loads configuration from ENV
  index.ts     # Server bootstrap (stdio/HTTP)
  http-server.ts
```

### Versioning

This project follows [Semantic Versioning](https://semver.org/) and
documents all changes in [CHANGELOG.md](CHANGELOG.md) following the
[Keep a Changelog](https://keepachangelog.com/) format.

### License

MIT – see [LICENSE](LICENSE).

---

## Deutsch

Ein einziger [MCP](https://modelcontextprotocol.io)-Server (Model Context
Protocol) mit **vollem Zugriff** auf dein HomeLab: Home Assistant, Portainer,
Sonarr, Radarr, SABnzbd, Jellyfin, Plex und GitHub – nutzbar direkt aus Claude heraus.

Gebaut, weil der Alltag im HomeLab zu langweilig sein sollte, um sich noch
selbst darum zu kümmern. Daher der Name.

**Neu hier?** Die komplette, leicht verständliche Schritt-für-Schritt-Anleitung
(inkl. optional NGINX Proxy Manager & Portainer installieren) steht in
[INSTALL.md](INSTALL.md).

### Features

| Dienst | Tool-Präfix | Beispiele |
|---|---|---|
| Home Assistant | `ha_*` | Zustände lesen/setzen, `ha_call_service` (jede Domain/jeder Service), Automationen/Skripte/Szenen anlegen & löschen, Core neu starten, History/Logbuch, Jinja-Templates rendern, **plus (seit 0.4.0) Registry-/Storage-Zugriff via WebSocket-API**: Areas/Floors/Labels/Categories, Geräte- & Entity-Registry, Helper (input_\*, counter, timer, schedule, zone, person, tag), Legacy-Gruppen, Dashboards & Resources, Kalender-Events, To-do-Listen, Config-Entries/Integrationen, Energie-Prefs, Assist-Pipelines, Automation-Traces, Bulk-Control über Area/Floor, Kamerabilder, Events, Backups, Blueprints, (best effort) HACS, Themes, ZHA/Z-Wave JS |
| Portainer | `portainer_*` | Environments, Container erstellen/starten/stoppen/löschen, Images pullen/löschen, Compose-Stacks anlegen/aktualisieren/löschen |
| Sonarr | `sonarr_*` | Serien suchen & hinzufügen, Queue verwalten, Kalender, manuelle Suche |
| Radarr | `radarr_*` | Filme suchen & hinzufügen, Queue verwalten, Kalender, manuelle Suche |
| SABnzbd | `sabnzbd_*` | Queue/Historie, pausieren/fortsetzen, Downloads hinzufügen |
| Jellyfin | `jellyfin_*` | Bibliothek durchsuchen, Sessions steuern, Scans anstoßen |
| Plex | `plex_*` | Bibliotheken durchsuchen, Scans anstoßen, Metadaten bearbeiten, als angesehen/unangesehen markieren, Sessions abbrechen, Elemente löschen |
| GitHub | `github_*` | Repos prüfen/suchen/anlegen, Branches, Dateien lesen/anlegen/ändern/löschen, Commits, Issues & Pull Requests |

Jeder Dienst ist **einzeln optional** – fehlt die Konfiguration für einen
Dienst, werden dessen Tools beim Start einfach nicht registriert (siehe
Konsolen-Log beim Start).

Referenz-Projekt für den Home-Assistant-Teil ist
[homeassistant-ai/ha-mcp](https://github.com/homeassistant-ai/ha-mcp);
TheBoringMCP bündelt zusätzlich Portainer und den ARR-Stack in einem
Server, statt mehrere MCP-Server parallel betreiben zu müssen. Seit
0.4.0 zieht der HA-Teil (über eine eigene WebSocket-Client-Implementierung,
`src/clients/homeassistant-ws.ts`) inhaltlich weitgehend mit `ha-mcp`
gleich – bewusst ausgenommen sind dessen server-eigene Meta-Tools
(`ha_get_skill_guide`, `ha_get_operation_status`, `ha_report_issue`), die
keine echten HA-Berechtigungen sind, sondern Doku/Job-Queue/Issue-Filing
der `ha-mcp`-Codebase selbst.

### Betriebsarten

TheBoringMCP unterstützt zwei Transportmodi:

1. **stdio** (Standard) – für die lokale Nutzung z.B. mit Claude Desktop
   oder Claude Code, wo der Prozess direkt vom Client gestartet wird.
2. **HTTP (Streamable)** – für den Dauerbetrieb als Container/Add-on, das
   Claude per URL erreicht (`TRANSPORT=http`).

#### 1) Als Home Assistant Add-on

1. In Home Assistant: *Einstellungen -> Add-ons -> Add-on-Store -> ⋮ ->
   Repositories* -> URL dieses Repos eintragen.
2. "TheBoringMCP" installieren, Optionen ausfüllen (siehe [DOCS.md](DOCS.md)),
   starten.
3. **Zwei Claude-Connectoren** anlegen (beide mit demselben
   `Authorization: Bearer <mcp_http_token>`-Header), da ein einzelner
   MCP-Server wegen der Home-Assistant-Erweiterung (~80 Tools) sonst über
   das 100-Tool-Limit von Claude-Connectoren käme:
   - `http://<ha-ip>:17820/` -> nur Home Assistant
   - `http://<ha-ip>:17820/rest` -> Portainer, Sonarr, Radarr, SABnzbd,
     Jellyfin, Plex, GitHub

#### 2) Als eigenständiger Docker-Container

```bash
git clone https://github.com/theboringalex/TheBoringMCP.git
cd TheBoringMCP
cp docker-compose.yml docker-compose.local.yml   # optional, Werte anpassen
docker compose up -d --build
```

Der Server läuft danach unter `http://<host>:17820/` (Home Assistant) und
`http://<host>:17820/rest` (alle anderen Dienste) – siehe Hinweis zum
100-Tool-Limit oben.

#### 3) Lokal per stdio (Claude Desktop / Claude Code)

```bash
git clone https://github.com/theboringalex/TheBoringMCP.git
cd TheBoringMCP
npm install
npm run build
```

In der Claude-Desktop-Konfiguration (`claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "theboringmcp": {
      "command": "node",
      "args": ["/pfad/zu/TheBoringMCP/dist/index.js"],
      "env": {
        "HA_URL": "http://192.168.1.11:8123",
        "HA_TOKEN": "...",
        "PORTAINER_URL": "https://192.168.1.11:9444",
        "PORTAINER_API_KEY": "...",
        "SONARR_URL": "http://192.168.1.5:8989",
        "SONARR_API_KEY": "...",
        "RADARR_URL": "http://192.168.1.5:7878",
        "RADARR_API_KEY": "...",
        "SABNZBD_URL": "http://192.168.1.5:6554",
        "SABNZBD_API_KEY": "...",
        "JELLYFIN_URL": "http://192.168.1.5:8096",
        "JELLYFIN_API_KEY": "...",
        "GITHUB_TOKEN": "...",
        "PLEX_URL": "http://192.168.1.5:32400",
        "PLEX_TOKEN": "..."
      }
    }
  }
}
```

### Konfiguration (Umgebungsvariablen)

Alle Variablen sind optional – nur die für die gewünschten Dienste
gesetzten Variablen werden aktiviert.

| Variable | Beschreibung |
|---|---|
| `HA_URL`, `HA_TOKEN` | Home-Assistant-Basis-URL + Long-Lived Access Token |
| `PORTAINER_URL`, `PORTAINER_API_KEY` | Portainer-URL + API-Key (*My Account -> Access Tokens*) |
| `PORTAINER_USERNAME`, `PORTAINER_PASSWORD` | Alternative zu API-Key: Login-Credentials |
| `PORTAINER_INSECURE_TLS` | Standard `true`: akzeptiert Portainer's selbstsigniertes TLS-Zertifikat (typisch im Heimnetz). Auf `false` setzen, sobald ein gültiges/vertrauenswürdiges Zertifikat vorliegt |
| `SONARR_URL`, `SONARR_API_KEY` | Sonarr-URL + API-Key (*Settings -> General*) |
| `RADARR_URL`, `RADARR_API_KEY` | Radarr-URL + API-Key |
| `SABNZBD_URL`, `SABNZBD_API_KEY` | SABnzbd-URL + API-Key |
| `JELLYFIN_URL`, `JELLYFIN_API_KEY` | Jellyfin-URL + API-Key (*Dashboard -> API Keys*) |
| `GITHUB_TOKEN` | Personal Access Token (fine-grained oder classic mit `repo`-Scope) |
| `GITHUB_API_URL` | Nur für GitHub Enterprise Server (Standard: `https://api.github.com`) |
| `PLEX_URL`, `PLEX_TOKEN` | Plex-Media-Server-URL + `X-Plex-Token` (siehe [Anleitung](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)) |
| `READ_ONLY` | `true` deaktiviert alle schreibenden/steuernden Tools |
| `TRANSPORT` | `stdio` (Standard) oder `http` |
| `PORT` | HTTP-Port im `http`-Modus (Standard `17820`) |
| `MCP_HTTP_TOKEN` | Bearer-Token, das im `http`-Modus für jeden Request verlangt wird |

### Sicherheit

TheBoringMCP gibt **vollen, ungefilterten Zugriff** – inklusive Löschen von
Containern, Automationen, Filmen/Serien und mehr. Im HTTP-Modus **immer**
`MCP_HTTP_TOKEN` setzen und den Port nicht ohne Reverse Proxy/TLS ins
Internet exponieren. Für reine Auswertung/Dashboards `READ_ONLY=true`
verwenden.

### Entwicklung

```bash
npm install
npm run dev     # tsx watch – Neustart bei Codeänderungen
npm run build   # -> dist/
npm run lint    # tsc --noEmit
```

Projektstruktur:

```
src/
  clients/     # Ein API-Client pro Dienst (nur HTTP, keine MCP-Logik)
  tools/       # MCP-Tool-Definitionen pro Dienst (zod-Schemas + Handler)
  config.ts    # Lädt Konfiguration aus ENV
  index.ts     # Server-Bootstrap (stdio/HTTP)
  http-server.ts
```

### Versionierung

Dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/) und
dokumentiert alle Änderungen in [CHANGELOG.md](CHANGELOG.md) nach dem
[Keep a Changelog](https://keepachangelog.com/de/)-Format.

### Lizenz

MIT – siehe [LICENSE](LICENSE).
