# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [1.1.0] - 2026-09-30

### Hinweis
- Versionssprung von 0.4.1 auf 1.1.0: Der laufende Add-on-Container war
  (unabhängig von diesem Changelog) bereits mit `io.hass.version: "1.0.0"`
  markiert. Home Assistant Supervisor vergleicht beim Update ausschließlich
  Versionsnummern und lehnt jede numerisch niedrigere Version als
  vermeintliches Downgrade ab – daher sprang die Versionierung hier direkt
  auf 1.1.0, um wieder oberhalb der installierten Version zu liegen.

### Hinzugefügt
- **Radarr-Movie-Editor-Tools**: `radarr_get_movie`, `radarr_update_movie`
  (PUT `/movie/{id}`), `radarr_bulk_edit_movies` (PUT `/movie/editor` –
  Root-Ordner/Qualitätsprofil/Monitored/Tags für mehrere Filme gleichzeitig
  ändern, mit `move_files`-Schalter) und `radarr_rescan_movie` (Command
  `RescanMovie`). Grund: nach einer NAS-Mount-Restrukturierung zeigten
  einzelne Filme in Radarrs eigener Datenbank noch auf einen alten,
  nicht mehr gemounteten Root-Ordner – dafür gab es bisher kein Tool.

## [0.4.0] - 2026-09-29

### Hinzugefügt
- **Home-Assistant-WebSocket-Client** (`src/clients/homeassistant-ws.ts`):
  eigene Verbindung zu `/api/websocket` (Auth-Handshake, Request/Response
  über Message-IDs, automatischer Neuaufbau bei Verbindungsverlust). Nötig,
  weil ein großer Teil von HA's Registries/Storage-Collections nur über
  diese API erreichbar ist, nicht über REST `/api`. Nutzt dieselbe
  `HA_URL`/`HA_TOKEN`-Konfiguration wie bisher, keine neuen ENV-Variablen.
- **~40 neue `ha_*`-Tools** (`src/tools/homeassistant.ts`), um inhaltlich
  mit dem Referenzprojekt `homeassistant-ai/ha-mcp` gleichzuziehen:
  - Registries: `ha_search`, `ha_get_entity`/`ha_set_entity`/
    `ha_remove_entity`, `ha_get_entity_exposure`, `ha_get_device`/
    `ha_set_device`/`ha_remove_device`, `ha_list_floors_areas`/
    `ha_set_area_or_floor`/`ha_remove_area_or_floor`
  - Helper & Zonen: `ha_get_zone`/`ha_set_zone`/`ha_remove_zone`,
    `ha_config_list_helpers`/`ha_config_set_helper`/
    `ha_remove_helpers_integrations` (deckt sowohl einfache Storage-Helper
    als auch Flow-basierte Helper/Integrationen als Config-Entry ab),
    Legacy-Gruppen (`ha_config_list_groups`/`ha_config_set_group`/
    `ha_config_remove_group`)
  - Labels/Categories: `ha_config_get_label`/`ha_config_set_label`/
    `ha_config_remove_label`, `ha_config_get_category`/
    `ha_config_set_category`/`ha_config_remove_category`
  - Dashboards: `ha_config_get_dashboard`/`ha_config_set_dashboard`/
    `ha_config_delete_dashboard`, `ha_config_list_dashboard_resources`/
    `ha_config_set_dashboard_resource`/`ha_config_delete_dashboard_resource`
  - Diagnose/System: `ha_get_automation_traces`, `ha_get_system_health`,
    `ha_get_logs`, `ha_get_integration`/`ha_set_integration`
  - Sonstiges: `ha_manage_energy_prefs`, `ha_manage_pipeline` (Assist),
    `ha_manage_theme`, `ha_manage_backup`, `ha_manage_blueprints`,
    `ha_get_camera_image`, `ha_get_todo`/`ha_set_todo_item`/
    `ha_remove_todo_item`, `ha_config_get_calendar_events`/
    `ha_config_set_calendar_event`/`ha_config_remove_calendar_event`,
    `ha_call_event`, `ha_bulk_control` (Area/Floor-Selector, max. 100
    Entities, `dry_run`)
  - Best effort / versionsabhängig, vor Produktiveinsatz testen:
    `ha_manage_hacs`/`ha_get_hacs_info` (HACS-WS-API ist inoffiziell),
    `ha_manage_radio` (ZHA/Z-Wave JS, sehr installationsabhängig),
    `ha_manage_theme`, `ha_set_integration`/`ha_manage_backup` (WS-Befehle
    ohne offizielle Stabilitätsgarantie)
  - Bewusst **nicht** übernommen: `ha_get_skill_guide`,
    `ha_get_operation_status`, `ha_report_issue` – das sind Meta-Tools des
    `ha-mcp`-Projekts selbst (Doku, Async-Job-Queue, GitHub-Issue-Filing
    gegen dessen eigenes Repo), keine echten HA-Berechtigungen.
  Alle schreibenden Tools respektieren wie gewohnt `READ_ONLY=true`.
- Neue Abhängigkeit: `ws` (WebSocket-Client-Library).

## [0.3.0] - 2026-09-29

### Hinzugefügt
- **Plex-Anbindung** (`PLEX_URL`, `PLEX_TOKEN`): neuer Client
  (`src/clients/plex.ts`) und 13 neue Tools (`src/tools/plex.ts`, Präfix
  `plex_*`):
  - Prüfen: `plex_server_info`, `plex_list_libraries`,
    `plex_list_library_items`, `plex_recently_added`, `plex_search`,
    `plex_get_item`, `plex_get_sessions`
  - Bearbeiten: `plex_update_metadata` (Titel, Zusammenfassung,
    Sortiertitel, ...), `plex_mark_watched`, `plex_mark_unwatched`,
    `plex_refresh_library`, `plex_refresh_all_libraries`,
    `plex_empty_trash`
  - Verwalten: `plex_terminate_session`, `plex_delete_item`
  Wie bei den anderen Diensten respektieren alle schreibenden Tools
  `READ_ONLY=true`. Auth läuft über den Header `X-Plex-Token`
  (Einstellungen -> Netzwerk -> Token, oder offizielle Plex-Anleitung).
- Add-on-Optionen `plex_url` / `plex_token` in `config.yaml`, `run.sh`
  reicht sie als `PLEX_URL`/`PLEX_TOKEN` durch; `docker-compose.yml` und
  `README.md`/`DOCS.md` entsprechend ergänzt.

## [0.2.0] - 2026-09-28

### Hinzugefügt
- **GitHub-Anbindung** (`GITHUB_TOKEN`, optional `GITHUB_API_URL` für GitHub
  Enterprise Server): neuer Client (`src/clients/github.ts`) und 16 neue
  Tools (`src/tools/github.ts`, Präfix `github_*`):
  - Prüfen: `github_whoami`, `github_list_repos`, `github_search_repos`,
    `github_get_repo`, `github_list_branches`, `github_list_directory`,
    `github_list_commits`, `github_list_issues`, `github_list_pull_requests`
  - Hochladen/Ändern: `github_create_or_update_file` (Base64-Kodierung und
    Ermittlung des aktuellen `sha` bei einem Update laufen automatisch),
    `github_get_file`, `github_delete_file`, `github_create_branch`
  - Verwalten: `github_create_repo`, `github_delete_repo`, `github_create_issue`,
    `github_create_pull_request`
  Wie bei den anderen Diensten respektieren alle schreibenden Tools
  `READ_ONLY=true`.
- Add-on-Optionen `github_token` / `github_api_url` in `config.yaml`,
  `run.sh` reicht sie als `GITHUB_TOKEN`/`GITHUB_API_URL` durch;
  `docker-compose.yml` und `README.md`/`DOCS.md` entsprechend ergänzt.

## [0.1.9] - 2026-09-28

### Behoben
- **Kernursache** für die fehlgeschlagene Connector-Verbindung aus Claude
  gefunden und behoben: der HTTP-Server hat bisher EINE einzige
  `StreamableHTTPServerTransport`-Instanz für die gesamte Laufzeit des
  Add-ons wiederverwendet. Das MCP-SDK erlaubt pro Transport aber nur
  einen einzigen `initialize`-Aufruf; jeder weitere (z.B. weil Claudes
  Connector-Backend beim Verbinden mehrfach `initialize` schickt, oder
  weil ein neuer Chat eine neue Verbindung aufbaut) wurde mit `400
  Invalid Request: Server already initialized` abgelehnt – nach außen
  sichtbar als "TheBoringMCP konnte nicht erreicht werden".
- `index.ts`/`http-server.ts`: auf den vom SDK vorgesehenen zustandslosen
  Modus umgestellt (`sessionIdGenerator: undefined`). Pro eingehendem
  HTTP-Request wird jetzt eine frische `McpServer`- und
  `StreamableHTTPServerTransport`-Instanz aufgebaut (`buildMcpServer()`
  in `index.ts`, aufgerufen aus `startHttpServer()`). Das ist für unsere
  Tools unproblematisch, da sie ohnehin zustandslos gegen HA/Portainer/
  Sonarr/Radarr/SABnzbd/Jellyfin arbeiten und keinen Session-Zustand
  benötigen.

## [0.1.8] - 2026-09-28

### Behoben
- `http-server.ts`: v0.1.7 brach den Add-on-Build (`tsc`: "Unused
  '@ts-expect-error' directive"), weil das Überschreiben von `res.end`
  TypeScript nicht wie erwartet stolperte. Auf ein `res.write`-Hook plus
  `res.on('finish', …)` umgestellt – baut sauber und protokolliert den
  Fehlerantwort-Body weiterhin.

## [0.1.7] - 2026-09-28 (Build fehlgeschlagen, nie live)

### Hinzugefügt
- `http-server.ts`: Fehlerantworten (Status >= 400) werden jetzt mit Body
  geloggt, ebenso der `Mcp-Session-Id`- und `Content-Type`-Header pro
  Request. Diagnose für die 400er, die nach dem erfolgreichen `initialize`
  bei den Folge-Requests des Claude-Connectors auftraten.

## [0.1.6] - 2026-09-28

### Behoben
- Nginx Proxy Manager: dem Proxy-Host für `theboringmcp.theboringit.de`
  fehlten `proxy_buffering off;`, `proxy_read_timeout`/`proxy_send_timeout`
  und `chunked_transfer_encoding off;` (im Gegensatz zum Proxy-Host für
  Home Assistant, der diese bereits hatte). Ohne diese Direktiven puffert
  Nginx die Streamable-HTTP-Antwort, wodurch der externe MCP-Handshake von
  Claude aus mit „Verbindung zum Server fehlgeschlagen" abbrach, obwohl
  `/healthz` normal erreichbar war.

### Hinzugefügt
- `http-server.ts`: Log-Zeile pro eingehendem Request (Methode, Pfad,
  ob ein Authorization-Header vorhanden ist, Accept-Header) und pro
  gesendeter Antwort (Statuscode) – zur Fehlersuche bei der
  Connector-Verbindung von außen. Keine Secrets im Log.

## [0.1.5] - 2026-09-27

### Geändert
- `run.sh`: ausführlichen Debug-Log (rohe Liste aller ENV-Variablennamen
  aus v0.1.3) wieder entfernt, kompakte Status-Zeile bleibt erhalten.
  Der `with-contenv`-Fix aus v0.1.4 ist auf dem eigenen HomeLab bestätigt
  funktionsfähig (Home Assistant meldet sich aktiv, MCP-Endpunkt antwortet
  auf einen echten `initialize`-Handshake).

## [0.1.4] - 2026-09-27

### Behoben
- `run.sh`: Shebang auf `#!/usr/bin/with-contenv sh` geändert. Das
  hassio-addons-Base-Image (s6-overlay) reicht das vom Supervisor gesetzte
  Container-Environment (`SUPERVISOR_TOKEN` u.a.) an ein per
  `legacy-services` gestartetes Skript nur mit `with-contenv` durch –
  Diagnose in v0.1.3 zeigte, dass ohne diesen Wrapper nur PATH/PWD/SHLVL
  und die selbst exportierten Variablen ankommen.

## [0.1.3] - 2026-09-27

### Hinzugefügt
- `run.sh`: zusätzliche Diagnosezeile, die alle im Container gesetzten
  ENV-Variablennamen (ohne Werte) loggt – zur Fehlersuche, warum
  `SUPERVISOR_TOKEN` trotz `hassio_api`/`homeassistant_api` leer blieb.

## [0.1.2] - 2026-09-27

### Behoben
- `config.yaml`: `hassio_api: true` zusätzlich zu `homeassistant_api: true`
  gesetzt – ohne `hassio_api` injiziert der Supervisor keinen
  `SUPERVISOR_TOKEN` in den Add-on-Container, wodurch der automatische
  Fallback auf die interne Core-API (`http://supervisor/core`) ohne
  eigenes Long-Lived-Token nicht funktionierte.

## [0.1.1] - 2026-09-27

### Behoben
- Dockerfile: `ARG BUILD_FROM` musste vor dem ersten `FROM` stehen, sonst
  blieb das Basis-Image im zweiten Stage leer und der Add-on-Build brach
  mit „base name should not be blank" ab.

### Hinzugefügt
- `run.sh`: Diagnose-Logzeile beim Start, die ohne Secrets preiszugeben
  zeigt, welche Umgebungsvariablen (inkl. `SUPERVISOR_TOKEN`) gesetzt sind.

## [0.1.0] - 2026-09-27

### Hinzugefügt
- Erste Version von TheBoringMCP: ein MCP-Server für Home Assistant,
  Portainer, Sonarr, Radarr, SABnzbd und Jellyfin.
- Home-Assistant-Tools: States lesen/setzen, beliebige Services aufrufen,
  Automationen/Skripte/Szenen anlegen/ändern/löschen, Core-Steuerung,
  History/Logbuch/Error-Log, Jinja-Template-Rendering.
- Portainer-Tools: Endpoints, Container (CRUD + Start/Stop/Restart/Pause),
  Images (pull/remove), Compose-Stacks (CRUD + Start/Stop).
- Sonarr/Radarr-Tools: Suche, Hinzufügen/Löschen, Queue, Kalender, manuelle
  Suche, Root-Ordner & Qualitätsprofile.
- SABnzbd-Tools: Queue/Historie, Pause/Resume, Download hinzufügen,
  Geschwindigkeitslimit, Serverstatistiken.
- Jellyfin-Tools: Bibliothekssuche, Sessions, Scans, Löschen von Items.
- Zwei Transportmodi: `stdio` (lokal, z.B. Claude Desktop/Code) und
  `http` (Streamable-HTTP mit Bearer-Token-Auth, für Dauerbetrieb).
- `READ_ONLY`-Modus zum Deaktivieren aller schreibenden Tools.
- Home-Assistant-Add-on-Packaging (`config.yaml`, `Dockerfile`, `run.sh`,
  `build.yaml`) inkl. automatischer Nutzung des Supervisor-Tokens.
- Eigenständiges `docker-compose.yml` für den Betrieb ohne Home Assistant.
- Doku (`README.md`, `DOCS.md`), MIT-Lizenz.

[Unreleased]: https://github.com/theboringalex/TheBoringMCP/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/theboringalex/TheBoringMCP/compare/v0.4.0...v1.1.0
[0.3.0]: https://github.com/theboringalex/TheBoringMCP/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.9...v0.2.0
[0.1.9]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/theboringalex/TheBoringMCP/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/theboringalex/TheBoringMCP/releases/tag/v0.1.0
