# TheBoringMCP

Ein einziger [MCP](https://modelcontextprotocol.io)-Server (Model Context
Protocol) mit **vollem Zugriff** auf dein HomeLab: Home Assistant, Portainer,
Sonarr, Radarr, SABnzbd, Jellyfin, Plex und GitHub – nutzbar direkt aus Claude heraus.

Gebaut, weil der Alltag im HomeLab zu langweilig sein sollte, um sich noch
selbst darum zu kümmern. Daher der Name.

## Features

| Dienst | Tool-Präfix | Beispiele |
|---|---|---|
| Home Assistant | `ha_*` | Zustände lesen/setzen, `ha_call_service` (jede Domain/jeder Service), Automationen/Skripte/Szenen anlegen & löschen, Core neu starten, History/Logbuch, Jinja-Templates rendern, **plus (seit 0.4.0) Registry-/Storage-Zugriff via WebSocket-API**: Areas/Floors/Labels/Categories, Geräte- & Entity-Registry, Helper (input_\*, counter, timer, schedule, zone, person, tag), Legacy-Gruppen, Dashboards & Resources, Kalender-Events, To-do-Listen, Config-Entries/Integrationen, Energie-Prefs, Assist-Pipelines, Automation-Traces, Bulk-Control über Area/Floor, Kamerabilder, Events, Backups, Blueprints, (best effort) HACS, Themes, ZHA/Z-Wave JS |
| Portainer | `portainer_*` | Environments, Container erstellen/starten/stoppen/löschen, Images pullen/löschen, Compose-Stacks anlegen/aktualisieren/löschen |
| Sonarr | `sonarr_*` | Serien suchen & hinzufügen, Queue verwalten, Kalender, manuelle Suche |
| Radarr | `radarr_*` | Filme suchen & hinzufügen, Queue verwalten, Kalender, manuelle Suche, **seit 0.4.1** Massenbearbeitung (Root-Ordner/Qualitätsprofil/Tags) & Rescan |
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

## Betriebsarten

TheBoringMCP unterstützt zwei Transportmodi:

1. **stdio** (Standard) – für die lokale Nutzung z.B. mit Claude Desktop
   oder Claude Code, wo der Prozess direkt vom Client gestartet wird.
2. **HTTP (Streamable)** – für den Dauerbetrieb als Container/Add-on, das
   Claude per URL erreicht (`TRANSPORT=http`).

### 1) Als Home Assistant Add-on

1. In Home Assistant: *Einstellungen -> Add-ons -> Add-on-Store -> ⋮ ->
   Repositories* -> URL dieses Repos eintragen.
2. "TheBoringMCP" installieren, Optionen ausfüllen (siehe [DOCS.md](DOCS.md)),
   starten.
3. Claude als Remote-MCP-Server auf `http://<ha-ip>:17820/` mit
   `Authorization: Bearer <mcp_http_token>` verbinden.

### 2) Als eigenständiger Docker-Container

```bash
git clone https://github.com/theboringalex/TheBoringMCP.git
cd TheBoringMCP
cp docker-compose.yml docker-compose.local.yml   # optional, Werte anpassen
docker compose up -d --build
```

Der Server läuft danach unter `http://<host>:17820/`.

### 3) Lokal per stdio (Claude Desktop / Claude Code)

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

## Konfiguration (Umgebungsvariablen)

Alle Variablen sind optional – nur die für die gewünschten Dienste
gesetzten Variablen werden aktiviert.

| Variable | Beschreibung |
|---|---|
| `HA_URL`, `HA_TOKEN` | Home-Assistant-Basis-URL + Long-Lived Access Token |
| `PORTAINER_URL`, `PORTAINER_API_KEY` | Portainer-URL + API-Key (*My Account -> Access Tokens*) |
| `PORTAINER_USERNAME`, `PORTAINER_PASSWORD` | Alternative zu API-Key: Login-Credentials |
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

## Sicherheit

TheBoringMCP gibt **vollen, ungefilterten Zugriff** – inklusive Löschen von
Containern, Automationen, Filmen/Serien und mehr. Im HTTP-Modus **immer**
`MCP_HTTP_TOKEN` setzen und den Port nicht ohne Reverse Proxy/TLS ins
Internet exponieren. Für reine Auswertung/Dashboards `READ_ONLY=true`
verwenden.

## Entwicklung

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

## Versionierung

Dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/) und
dokumentiert alle Änderungen in [CHANGELOG.md](CHANGELOG.md) nach dem
[Keep a Changelog](https://keepachangelog.com/de/)-Format.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
