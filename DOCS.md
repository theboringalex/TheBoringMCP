# TheBoringMCP v2 – Add-on Documentation

🇬🇧 **[English](#english)** · 🇩🇪 **[Deutsch](#deutsch)**

---

## English

### What does this add-on do?

It starts an [MCP](https://modelcontextprotocol.io) server that gives Claude **full read/write access** to eight apps: **Home Assistant, Sonarr, Radarr, SABnzbd, Jellyfin, Portainer, UniFi Protect and n8n**. Every app has its own on/off switch. New to this? Read the [beginner guide](INSTALL.md#english).

### Settings page

Open **TheBoringMCP** in the Home Assistant sidebar (Ingress). One card per app with logo, on/off switch, address, key and a **Test connection** button. Secrets are never shown again after saving (leave a field empty to keep the stored value). The normal **Configuration** tab shows the same options.

### Options

| Option | Meaning |
|---|---|
| `mcp_http_token` | Password for the MCP endpoint (header `Authorization: Bearer …`). **Always set one.** |
| `read_only` | `true` = all write tools are blocked. |
| `ha_enabled`, `ha_url`, `ha_token` | Home Assistant. Leave URL/token empty = automatic via Supervisor. |
| `sonarr_enabled`, `sonarr_url`, `sonarr_api_key` | Sonarr (Settings → General → Security). |
| `radarr_enabled`, `radarr_url`, `radarr_api_key` | Radarr. |
| `sabnzbd_enabled`, `sabnzbd_url`, `sabnzbd_api_key` | SABnzbd. |
| `jellyfin_enabled`, `jellyfin_url`, `jellyfin_api_key` | Jellyfin (Dashboard → API Keys). |
| `portainer_enabled`, `portainer_url`, `portainer_api_key`, `portainer_insecure_tls` | Portainer (My account → Access tokens). |
| `unifi_protect_enabled`, `unifi_protect_url`, `unifi_protect_api_key`, `unifi_protect_insecure_tls` | UniFi Protect (Control Plane → Integrations). |
| `n8n_enabled`, `n8n_url`, `n8n_api_key` | n8n (Settings → n8n API). |

An app is active when it is **enabled and has an address and key**. Otherwise its tools are not offered.

### Addresses (paths) and tool limit

Claude.ai allows ~100 tools per connector, so create **one connector per app** (same token); no app has more than 100 tools:

| Path | Contains | Tools |
|---|---|---|
| `/ha` | Home Assistant | 78 |
| `/sonarr` | Sonarr | 52 |
| `/radarr` | Radarr | 47 |
| `/sabnzbd` | SABnzbd | 25 |
| `/jellyfin` | Jellyfin | 28 |
| `/portainer` | Portainer | 22 |
| `/protect` | UniFi Protect | 29 |
| `/n8n` | n8n | 35 |
| `/` | everything | 316 |
| `/arr` `/media` `/infra` | optional bundles (Sonarr+Radarr, Jellyfin+SABnzbd, Portainer+Protect+n8n) | ≤ 99 |
| `/rest` | everything except Home Assistant (v1 compatibility) | – |

Health check: `/healthz`.

### Environment variables (Docker / stdio)

Same names as the options in capital letters: `HA_URL`, `HA_TOKEN`, `SONARR_URL`, `SONARR_API_KEY`, `RADARR_*`, `SABNZBD_*`, `JELLYFIN_*`, `PORTAINER_URL`, `PORTAINER_API_KEY` (or `PORTAINER_USERNAME` + `PORTAINER_PASSWORD`), `PORTAINER_INSECURE_TLS`, `UNIFI_PROTECT_URL`, `UNIFI_PROTECT_API_KEY`, `UNIFI_PROTECT_INSECURE_TLS`, `N8N_URL`, `N8N_API_KEY`. Switch an app off with `<APP>_ENABLED=false`. Also: `READ_ONLY`, `TRANSPORT` (`stdio`|`http`), `PORT` (17820), `MCP_HTTP_TOKEN`, `MCP_SERVICES` (stdio only, e.g. `sonarr,radarr`).

### Master-key tools

Each app has a generic tool (`sonarr_api`, `radarr_api`, `jellyfin_api`, `portainer_api`, `protect_api`, `n8n_api`) for any API call without a dedicated tool. `GET` works always; other methods are blocked in read-only mode.

### UniFi Protect notes

Uses the official Protect *Integration API* (API key). Camera snapshots are returned as images. Features that only exist in the private Protect API (e.g. event history) are not covered.

### Security notice

This add-on grants full, unfiltered write access. Set a strong `mcp_http_token`, never expose the port without HTTPS, and use `read_only: true` for look-only use.

---

## Deutsch

### Was macht dieses Add-on?

Es startet einen [MCP](https://modelcontextprotocol.io)-Server, der Claude **vollen Lese- und Schreibzugriff** auf acht Programme gibt: **Home Assistant, Sonarr, Radarr, SABnzbd, Jellyfin, Portainer, UniFi Protect und n8n**. Jedes Programm hat einen eigenen Ein/Aus-Schalter. Neu dabei? Lies die [Einsteiger-Anleitung](INSTALL.md#deutsch).

### Einstellungsseite

**TheBoringMCP** in der Seitenleiste von Home Assistant öffnen (Ingress). Eine Karte pro Programm mit Logo, Ein/Aus-Schalter, Adresse, Schlüssel und **Verbindung testen**. Geheimnisse werden nach dem Speichern nie wieder angezeigt (Feld leer lassen = gespeicherten Wert behalten). Der normale Reiter **Konfiguration** zeigt dieselben Optionen.

### Optionen

| Option | Bedeutung |
|---|---|
| `mcp_http_token` | Passwort für den MCP-Zugang (Header `Authorization: Bearer …`). **Immer setzen.** |
| `read_only` | `true` = alle schreibenden Tools gesperrt. |
| `ha_enabled`, `ha_url`, `ha_token` | Home Assistant. URL/Token leer = automatisch über den Supervisor. |
| `sonarr_enabled`, `sonarr_url`, `sonarr_api_key` | Sonarr (Einstellungen → Allgemein → Sicherheit). |
| `radarr_enabled`, `radarr_url`, `radarr_api_key` | Radarr. |
| `sabnzbd_enabled`, `sabnzbd_url`, `sabnzbd_api_key` | SABnzbd. |
| `jellyfin_enabled`, `jellyfin_url`, `jellyfin_api_key` | Jellyfin (Dashboard → API-Schlüssel). |
| `portainer_enabled`, `portainer_url`, `portainer_api_key`, `portainer_insecure_tls` | Portainer (Mein Konto → Zugriffstoken). |
| `unifi_protect_enabled`, `unifi_protect_url`, `unifi_protect_api_key`, `unifi_protect_insecure_tls` | UniFi Protect (Control Plane → Integrationen). |
| `n8n_enabled`, `n8n_url`, `n8n_api_key` | n8n (Einstellungen → n8n API). |

Ein Programm ist aktiv, wenn es **eingeschaltet ist und Adresse sowie Schlüssel hat**. Sonst werden seine Tools nicht angeboten.

### Adressen (Pfade) und Tool-Limit

Claude.ai erlaubt ~100 Tools pro Connector. lege **pro Programm einen Connector** an (gleiches Token); kein Programm hat mehr als 100 Tools:

| Pfad | Enthält | Tools |
|---|---|---|
| `/ha` | Home Assistant | 78 |
| `/sonarr` | Sonarr | 52 |
| `/radarr` | Radarr | 47 |
| `/sabnzbd` | SABnzbd | 25 |
| `/jellyfin` | Jellyfin | 28 |
| `/portainer` | Portainer | 22 |
| `/protect` | UniFi Protect | 29 |
| `/n8n` | n8n | 35 |
| `/` | alles | 316 |
| `/arr` `/media` `/infra` | optional bundles (Sonarr+Radarr, Jellyfin+SABnzbd, Portainer+Protect+n8n) | ≤ 99 |
| `/rest` | alles außer Home Assistant (v1-Kompatibilität) | – |

Health-Check: `/healthz`.

### Umgebungsvariablen (Docker / stdio)

Gleiche Namen wie die Optionen in Großbuchstaben: `HA_URL`, `HA_TOKEN`, `SONARR_URL`, `SONARR_API_KEY`, `RADARR_*`, `SABNZBD_*`, `JELLYFIN_*`, `PORTAINER_URL`, `PORTAINER_API_KEY` (oder `PORTAINER_USERNAME` + `PORTAINER_PASSWORD`), `PORTAINER_INSECURE_TLS`, `UNIFI_PROTECT_URL`, `UNIFI_PROTECT_API_KEY`, `UNIFI_PROTECT_INSECURE_TLS`, `N8N_URL`, `N8N_API_KEY`. Ein Programm ausschalten: `<APP>_ENABLED=false`. Außerdem: `READ_ONLY`, `TRANSPORT` (`stdio`|`http`), `PORT` (17820), `MCP_HTTP_TOKEN`, `MCP_SERVICES` (nur stdio, z. B. `sonarr,radarr`).

### Generalschlüssel-Tools

Jedes Programm hat ein generisches Tool (`sonarr_api`, `radarr_api`, `jellyfin_api`, `portainer_api`, `protect_api`, `n8n_api`) für jeden API-Aufruf ohne eigenes Tool. `GET` geht immer; andere Methoden sind im Nur-Lesen-Modus gesperrt.

### Hinweise zu UniFi Protect

Nutzt die offizielle Protect-*Integration-API* (API-Schlüssel). Kamera-Standbilder kommen als Bild zurück. Funktionen, die nur in der privaten Protect-API existieren (z. B. Ereignisverlauf), sind nicht abgedeckt.

### Sicherheitshinweis

Dieses Add-on gibt vollen, ungefilterten Schreibzugriff. Setze ein starkes `mcp_http_token`, öffne den Port nie ohne HTTPS und nutze `read_only: true` für reines Ansehen.
