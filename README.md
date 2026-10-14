# TheBoringMCP

🇬🇧 **[English](#english)** · 🇩🇪 **[Deutsch](#deutsch)**

[![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftheboringalex%2FTheBoringMCP)

<a href="https://www.buymeacoffee.com/theboringit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

## English

**Talk to your home lab. Let Claude do the boring work.**

TheBoringMCP connects the AI assistant [Claude](https://claude.ai) to the programs that run your home and your media – so you can simply *ask*:

> "Which Docker containers are running?" · "Turn off all lights downstairs." · "Add the show *Severance* to Sonarr." · "Why is my SABnzbd download stuck?" · "Which firewall rules are active for the IoT network?" · "Create an n8n workflow that sends me a message when the washing machine is done."

No coding needed. You install one add-on, switch on the apps you use, and connect Claude.

### What is this? (in plain words)

Claude can only *talk* – unless you give it "hands". These hands are called an **MCP server**. TheBoringMCP is one MCP server that gives Claude hands for **8 programs at once**. Every program has its own **on/off switch**, so Claude only touches what you allow.

| | App | What Claude can do (examples) | Tools |
|---|---|---|---|
| 🏠 | **Home Assistant** | switch devices, create automations, dashboards, read history, restart | 78 |
| 📺 | **Sonarr** | add/remove shows, search episodes, queue, quality profiles, calendar | 52 |
| 🎬 | **Radarr** | add/remove movies, search, queue, quality profiles, calendar | 47 |
| ⬇️ | **SABnzbd** | see/pause/resume downloads, add NZBs, speed limit, history, retry | 25 |
| 🍿 | **Jellyfin** | search library, who is watching, users, scans, scheduled tasks | 28 |
| 🐳 | **Portainer** | start/stop/create containers, stacks, images, logs | 22 |
| 🛜 | **UniFi** (gateway) | networks/VLANs, Wi-Fi, **firewall zones & rules**, ACLs, DNS policies, devices, clients, guest vouchers, VPN/WAN info | 62 |
| 🔗 | **n8n** | create/edit/run workflows, executions, credentials, tags, variables | 35 |

Every app also has a **"master key" tool** (e.g. `sonarr_api`) so Claude can reach *any* feature of the app's API – even ones that have no dedicated tool.

✅ **Full write access** to every app (can be turned into view-only with one switch).
✅ **Settings page with logos and switches** right inside Home Assistant (sidebar → *TheBoringMCP*).
✅ **"Test connection"** button for every app – no guessing if you typed it right.

### Quick start (about 10 minutes)

1. **Add the repository** to Home Assistant – click this button:

   [![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftheboringalex%2FTheBoringMCP)

   (or: *Settings → Add-ons → Add-on Store → ⋮ → Repositories* → paste `https://github.com/theboringalex/TheBoringMCP`)
2. Install **TheBoringMCP** and click **Start**.
3. Open **TheBoringMCP** in the Home Assistant sidebar. Click **Generate** next to the password, switch on the apps you use, paste each app's address and API key, press **Test connection**, then **Save & restart**.
4. Connect Claude (see [INSTALL.md](INSTALL.md#english) – step by step, with pictures-in-words).

👉 **Complete beginner guide: [INSTALL.md](INSTALL.md#english)**

### Using it with Claude.ai: why several addresses?

Claude.ai accepts at most **~100 tools per connector**. That is why **every app gets its own connector** (none of them has more than 100 tools – the biggest, Home Assistant, has 78). Create one connector per app you use, all with the same password:

| Connector | Address (path) | Tools |
|---|---|---|
| Home Assistant | `/ha` | 78 |
| Sonarr | `/sonarr` | 52 |
| Radarr | `/radarr` | 47 |
| SABnzbd | `/sabnzbd` | 25 |
| Jellyfin | `/jellyfin` | 28 |
| Portainer | `/portainer` | 22 |
| UniFi | `/unifi` | 62 |
| n8n | `/n8n` | 35 |
| *Everything at once (Claude Desktop / Claude Code – no limit there)* | `/` | 349 |

(Optional bundles that stay under the limit: `/arr`, `/media`, `/infra`.)

### Security – please read

TheBoringMCP gives **full control**. Always set a password (the add-on page can generate one), never open the port to the internet without HTTPS (a reverse proxy such as Nginx Proxy Manager – see the guide), and switch on **Read-only mode** if you only want Claude to look around.

### Other ways to run it

- **Docker:** `docker compose up -d --build` (see `docker-compose.yml`, all values are written directly in the file – no `.env` needed).
- **Claude Desktop / Claude Code (stdio):** `npm install && npm run build`, then register `node dist/index.js` with environment variables such as `SONARR_URL` and `SONARR_API_KEY`. Set `SONARR_ENABLED=false` to switch an app off. Full list: [DOCS.md](DOCS.md#english).

### Development

```bash
npm install
npm run dev     # restart on changes
npm run build   # -> dist/
npm run lint    # tsc --noEmit
```

Structure: `src/clients/` (one API client per app) · `src/tools/` (MCP tools per app) · `src/admin-ui.ts` + `src/ui/` (settings page) · `src/config.ts` · `src/index.ts` · `src/http-server.ts`.

### Upgrading from 1.x

Version 2 supports exactly the 8 apps above. **Plex and GitHub were removed** (use the official GitHub MCP server instead). Sonarr, Radarr and SABnzbd are back, with many more tools. The old `/rest` address still works and now means "everything except Home Assistant". See [CHANGELOG.md](CHANGELOG.md).

### License & versions

MIT – see [LICENSE](LICENSE). Changes: [CHANGELOG.md](CHANGELOG.md) ([Semantic Versioning](https://semver.org)).

---

## Deutsch

**Sprich mit deinem HomeLab. Lass Claude die langweilige Arbeit machen.**

TheBoringMCP verbindet den KI-Assistenten [Claude](https://claude.ai) mit den Programmen, die dein Zuhause und deine Medien steuern – du kannst einfach *fragen*:

> „Welche Docker-Container laufen gerade?" · „Mach unten alle Lichter aus." · „Füge die Serie *Severance* zu Sonarr hinzu." · „Warum hängt mein SABnzbd-Download?" · „Welche Firewall-Regeln gelten für das IoT-Netz?" · „Bau mir einen n8n-Workflow, der mir Bescheid gibt, wenn die Waschmaschine fertig ist."

Du musst nicht programmieren können. Du installierst ein Add-on, schaltest die Programme ein, die du nutzt, und verbindest Claude.

### Was ist das? (einfach erklärt)

Claude kann von sich aus nur *reden* – außer du gibst ihm „Hände". Diese Hände heißen **MCP-Server**. TheBoringMCP ist ein MCP-Server, der Claude Hände für **8 Programme gleichzeitig** gibt. Jedes Programm hat einen eigenen **Ein/Aus-Schalter** – Claude fasst nur an, was du erlaubst.

| | Programm | Das kann Claude (Beispiele) | Tools |
|---|---|---|---|
| 🏠 | **Home Assistant** | Geräte schalten, Automationen anlegen, Dashboards, Verlauf, Neustart | 78 |
| 📺 | **Sonarr** | Serien hinzufügen/löschen, Folgen suchen, Warteschlange, Qualitätsprofile, Kalender | 52 |
| 🎬 | **Radarr** | Filme hinzufügen/löschen, suchen, Warteschlange, Qualitätsprofile, Kalender | 47 |
| ⬇️ | **SABnzbd** | Downloads ansehen/pausieren/fortsetzen, NZBs hinzufügen, Speed-Limit, Verlauf | 25 |
| 🍿 | **Jellyfin** | Bibliothek durchsuchen, wer schaut gerade, Benutzer, Scans, geplante Aufgaben | 28 |
| 🐳 | **Portainer** | Container starten/stoppen/anlegen, Stacks, Images, Logs | 22 |
| 🛜 | **UniFi** (Gateway) | Netzwerke/VLANs, WLAN, **Firewall-Zonen & -Regeln**, ACLs, DNS-Richtlinien, Geräte, Clients, Gast-Gutscheine, VPN-/WAN-Infos | 62 |
| 🔗 | **n8n** | Workflows anlegen/ändern/starten, Ausführungen, Zugangsdaten, Tags, Variablen | 35 |

Jedes Programm hat zusätzlich ein **„Generalschlüssel"-Tool** (z. B. `sonarr_api`), mit dem Claude *jede* Funktion der Programm-Schnittstelle erreicht – auch solche ohne eigenes Tool.

✅ **Volle Schreibrechte** auf jedes Programm (mit einem Schalter auf „nur ansehen" umstellbar).
✅ **Einstellungsseite mit Logos und Schaltern** direkt in Home Assistant (Seitenleiste → *TheBoringMCP*).
✅ **„Verbindung testen"**-Knopf bei jedem Programm – kein Rätselraten, ob alles stimmt.

### Schnellstart (ca. 10 Minuten)

1. **Repository zu Home Assistant hinzufügen** – klicke auf diesen Knopf:

   [![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftheboringalex%2FTheBoringMCP)

   (oder: *Einstellungen → Add-ons → Add-on-Store → ⋮ → Repositories* → `https://github.com/theboringalex/TheBoringMCP` einfügen)
2. **TheBoringMCP** installieren und auf **Starten** klicken.
3. **TheBoringMCP** in der Home-Assistant-Seitenleiste öffnen. Neben dem Passwort auf **Erzeugen** klicken, die Programme einschalten, die du nutzt, jeweils Adresse und API-Schlüssel einfügen, **Verbindung testen** drücken und dann **Speichern & neu starten**.
4. Claude verbinden (siehe [INSTALL.md](INSTALL.md#deutsch) – Schritt für Schritt, in einfachen Worten).

👉 **Komplette Einsteiger-Anleitung: [INSTALL.md](INSTALL.md#deutsch)**

### Nutzung mit Claude.ai: Warum mehrere Adressen?

Claude.ai erlaubt höchstens **~100 Tools pro Connector**. Deshalb bekommt **jedes Programm seinen eigenen Connector** (keins hat mehr als 100 Tools – das größte, Home Assistant, hat 78). Lege pro genutztem Programm einen Connector an, überall mit demselben Passwort:

| Connector | Adresse (Pfad) | Tools |
|---|---|---|
| Home Assistant | `/ha` | 78 |
| Sonarr | `/sonarr` | 52 |
| Radarr | `/radarr` | 47 |
| SABnzbd | `/sabnzbd` | 25 |
| Jellyfin | `/jellyfin` | 28 |
| Portainer | `/portainer` | 22 |
| UniFi | `/unifi` | 62 |
| n8n | `/n8n` | 35 |
| *Alles auf einmal (Claude Desktop / Claude Code – dort kein Limit)* | `/` | 349 |

(Optionale Bündel unterhalb des Limits: `/arr`, `/media`, `/infra`.)

### Sicherheit – bitte lesen

TheBoringMCP gibt **volle Kontrolle**. Setze immer ein Passwort (die Einstellungsseite kann eins erzeugen), öffne den Port nie ohne HTTPS ins Internet (Reverse Proxy wie Nginx Proxy Manager – siehe Anleitung) und schalte den **Nur-Lesen-Modus** ein, wenn Claude nur zuschauen soll.

### Andere Betriebsarten

- **Docker:** `docker compose up -d --build` (siehe `docker-compose.yml`, alle Werte stehen direkt in der Datei – keine `.env` nötig).
- **Claude Desktop / Claude Code (stdio):** `npm install && npm run build`, dann `node dist/index.js` mit Umgebungsvariablen wie `SONARR_URL` und `SONARR_API_KEY` eintragen. Mit `SONARR_ENABLED=false` schaltest du ein Programm aus. Vollständige Liste: [DOCS.md](DOCS.md#deutsch).

### Entwicklung

```bash
npm install
npm run dev     # Neustart bei Änderungen
npm run build   # -> dist/
npm run lint    # tsc --noEmit
```

Struktur: `src/clients/` (ein API-Client pro Programm) · `src/tools/` (MCP-Tools pro Programm) · `src/admin-ui.ts` + `src/ui/` (Einstellungsseite) · `src/config.ts` · `src/index.ts` · `src/http-server.ts`.

### Update von 1.x

Version 2 unterstützt genau die 8 Programme oben. **Plex und GitHub wurden entfernt** (nutze stattdessen den offiziellen GitHub-MCP-Server). Sonarr, Radarr und SABnzbd sind zurück – mit deutlich mehr Tools. Die alte Adresse `/rest` funktioniert weiter und bedeutet jetzt „alles außer Home Assistant". Siehe [CHANGELOG.md](CHANGELOG.md).

### Lizenz & Versionen

MIT – siehe [LICENSE](LICENSE). Änderungen: [CHANGELOG.md](CHANGELOG.md) ([Semantic Versioning](https://semver.org/lang/de/)).
