# Installation Guide – TheBoringMCP

🇬🇧 **[English](#english)** · 🇩🇪 **[Deutsch](#deutsch)**

---

## English

This guide takes you all the way from zero to a fully working MCP server
in Claude – step by step, no prior knowledge required. It is written for
installation **as a Home Assistant add-on** (the recommended way);
alternatives (Docker container, local via stdio) are covered in
[README.md](README.md).

If you haven't installed NGINX Proxy Manager or Portainer yet, this guide
also shows you how to add them as add-ons – both are optional and only
needed if you want to use the corresponding features.

---

### Contents

1. [What you'll end up with](#1-what-youll-end-up-with)
2. [Prerequisites](#2-prerequisites)
3. [Optional: Install Portainer](#3-optional-install-portainer)
4. [Optional: Install NGINX Proxy Manager](#4-optional-install-nginx-proxy-manager)
5. [Install TheBoringMCP](#5-install-theboringmcp)
6. [Configure the add-on](#6-configure-the-add-on)
7. [Get API keys & tokens](#7-get-api-keys--tokens)
8. [Start & verify the add-on](#8-start--verify-the-add-on)
9. [Connect to Claude](#9-connect-to-claude)
10. [Troubleshooting](#10-troubleshooting)

---

### 1. What you'll end up with

An MCP server running on your Home Assistant NAS/box that gives Claude
full access to your HomeLab: Home Assistant itself, Portainer (Docker),
Sonarr, Radarr, SABnzbd, Jellyfin, Plex, and GitHub. You can then simply
ask Claude things like: *"Restart the Jellyfin container"*, *"Add series
XY to Sonarr"*, or *"Create a new Home Assistant automation that dims the
lights in the evening"* – Claude handles it directly.

### 2. Prerequisites

- A running **Home Assistant OS / Supervised** installation (add-ons need
  the Supervisor – a plain "Home Assistant Container" without Supervisor
  doesn't work for the add-on route; in that case please use the
  [Docker route in the README](README.md#2-as-a-standalone-docker-container)
  instead).
- Access to the Home Assistant web UI with an admin account.
- For the services you want to connect (Portainer, Sonarr, Radarr,
  SABnzbd, Jellyfin, Plex, GitHub): these should already be running, and
  you'll need a GitHub account. Every service is optional – you can start
  with just Home Assistant and add more later.
- A Claude account on [claude.ai](https://claude.ai) or Claude Desktop
  (for the connector setup in step 9).

### 3. Optional: Install Portainer

Portainer manages your Docker containers. You only need it if you want to
use the `portainer_*` tools (managing containers/stacks/images). If
Portainer is already running for you (e.g. on the NAS itself), **skip
this step**.

1. In Home Assistant: **Settings → Add-ons → Add-on Store**.
2. Top right, click the three dots (⋮) → **Repositories** → add the
   following URL and confirm with **Add**:
   ```
   https://github.com/portainer/portainer-ha-addon
   ```
   *(If this repository isn't available for you: Portainer works just as
   well as a standalone Docker container directly on your NAS – the
   official guide for that is at
   [docs.portainer.io](https://docs.portainer.io/start/install-ce/server/docker).)*
3. Reload the store (refresh the page), search for "Portainer", install,
   start.
4. Portainer will then be reachable at e.g. `https://<ha-ip>:9443`. On
   first launch you'll create an admin user.
5. Note down the URL – you'll need it in step 6.

> **Note on self-signed certificates:** Portainer usually uses a
> self-signed HTTPS certificate on a home network. TheBoringMCP accepts
> that by default (`portainer_insecure_tls: true`) – you don't need to do
> anything else unless you later get a real certificate.

### 4. Optional: Install NGINX Proxy Manager

You do **not** need NGINX Proxy Manager (NPM) for TheBoringMCP to work –
on your local network `http://<ha-ip>:17820` is enough. NPM is useful if
you want to make the MCP server reachable under your own domain with a
valid TLS certificate (e.g. to access it from Claude Desktop while away
from home, without a VPN).

1. **Settings → Add-ons → Add-on Store** → ⋮ → **Repositories** → add the
   following URL:
   ```
   https://github.com/hassio-addons/repository
   ```
2. Reload the store, search for **"NGINX Proxy Manager"**, install,
   start.
3. Open the UI via the add-on info area (default login:
   `admin@example.com` / `changeme` – change it immediately!).
4. **Proxy Hosts → Add Proxy Host**:
   - *Domain Names*: your desired subdomain, e.g. `mcp.yourdomain.com`
   - *Scheme*: `http`
   - *Forward Hostname/IP*: your Home Assistant instance's IP
   - *Forward Port*: `17820`
   - Under the **SSL** tab: enable *Request a new SSL Certificate* (Let's
     Encrypt), check *Force SSL*.
5. Save. The MCP server will then also be reachable at
   `https://mcp.yourdomain.com/`.

This requires the domain to point via DNS to your public IP, and port 443
(and possibly 80 for certificate validation) to be forwarded to your Home
Assistant box in your router.

### 5. Install TheBoringMCP

1. **Settings → Add-ons → Add-on Store** → ⋮ → **Repositories** → add the
   following URL:
   ```
   https://github.com/theboringalex/TheBoringMCP
   ```
2. Reload the store page (F5). "TheBoringMCP" should now appear (possibly
   at the bottom, under local/additional add-ons).
3. Open it → click **Install**. Depending on your hardware this takes a
   few minutes (the container is built from source the first time).

### 6. Configure the add-on

After installation, switch to the add-on's **Configuration** tab. You'll
see a list of options – **everything is optional except `mcp_http_token`**.
Only fill in what you actually want to use; leave missing lines empty and
the corresponding service is automatically skipped (this also shows up in
the add-on log at startup).

| Option | Required? | What to enter |
|---|---|---|
| `mcp_http_token` | **Yes** | A self-chosen, long random password (e.g. from a password generator, 32+ characters). Protects the entire server. |
| `read_only` | No | `true` if Claude should **only read**, never change or control anything. Default: `false`. |
| `ha_url`, `ha_token` | No | Only needed for an **external** Home Assistant instance. If the add-on runs on the same HA instance (the normal case), please **leave empty** – access then happens automatically via the Supervisor. |
| `portainer_url`, `portainer_api_key` | No | Portainer URL and API key, see step 7. |
| `portainer_insecure_tls` | No | Default `true` (see the note above on self-signed certificates). |
| `sonarr_url`, `sonarr_api_key` | No | See step 7. |
| `radarr_url`, `radarr_api_key` | No | See step 7. |
| `sabnzbd_url`, `sabnzbd_api_key` | No | See step 7. |
| `jellyfin_url`, `jellyfin_api_key` | No | See step 7. |
| `plex_url`, `plex_token` | No | See step 7. |
| `github_token`, `github_api_url` | No | See step 7. `github_api_url` is only needed for GitHub Enterprise Server. |

### 7. Get API keys & tokens

Only fill in the services you actually want to connect.

- **Portainer**: In Portainer, top right, click your username →
  **My account** → **Access tokens** → **Add access token** → give it a
  name → copy the generated token (it's only shown once!).
- **Sonarr / Radarr / SABnzbd**: In the respective app under
  **Settings → General** (for SABnzbd: **Config → General**) the API key
  is shown directly.
- **Jellyfin**: **Dashboard → API Keys → +** → give it a name → copy the
  key.
- **Plex**: Open any media item in the Plex web app → "..." (three dots)
  → **Get Info** → **View XML** – the URL that opens contains
  `...&X-Plex-Token=YOUR_TOKEN`. Detailed guide:
  [official Plex support article](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/).
- **GitHub**: [github.com/settings/tokens](https://github.com/settings/tokens)
  → **Generate new token** (fine-grained, scoped to only the repos you
  want, recommended) or classic with the `repo` scope.

### 8. Start & verify the add-on

1. Save the configuration (**Save** button in the Configuration tab).
2. Switch to the **Info** tab, click **Start**.
3. In the **Log** tab you should see something like
   ```
   TheBoringMCP v1.0.0 started (transport: http, port: 17820)
   Enabled services: home-assistant, portainer, ...
   ```
   – the list shows exactly the services for which you entered valid
   credentials above.
4. If an error shows up for a specific service (e.g. a wrong URL), check
   the corresponding configuration line – the server still starts, only
   the faulty service stays inactive.

### 9. Connect to Claude

Important: **Home Assistant alone already brings ~80 tools.** A Claude
connector, however, can have at most 100 tools. That's why the server
offers **two separate paths**, set up as **two separate connectors** –
both using the same token:

| Connector name (your choice) | URL | Contains |
|---|---|---|
| TheBoringMCP – Home Assistant | `http://<home-assistant-ip>:17820/` | only Home Assistant |
| TheBoringMCP – Rest | `http://<home-assistant-ip>:17820/rest` | Portainer, Sonarr, Radarr, SABnzbd, Jellyfin, Plex, GitHub |

Here's how to set up both (in [claude.ai](https://claude.ai) or Claude
Desktop):

1. **Settings → Connectors → Add connector** (or "Add custom
   connector").
2. Give it a name (e.g. "HomeLab – Home Assistant"), enter
   `http://<home-assistant-ip>:17820/` as the URL.
3. Under headers: `Authorization` = `Bearer <your mcp_http_token>`
   (e.g. `Bearer mySuperSecretPassword123`).
4. Save – the connector should connect immediately.
5. **Repeat** steps 1–4 for the second connector, this time with the URL
   `http://<home-assistant-ip>:17820/rest`.

If you're using NGINX Proxy Manager (step 4), you can use your domain
instead of the IP, e.g. `https://mcp.yourdomain.com/` and
`https://mcp.yourdomain.com/rest`.

Done – now just ask Claude something like *"Which Docker containers are
currently running?"* or *"Show me the status of all Home Assistant
lights"*.

### 10. Troubleshooting

- **Connector won't connect**: Is the IP/domain reachable from your
  Claude client? Does the `Authorization` header match exactly (including
  `Bearer ` with a space)? Is the add-on running (*Info* tab)?
- **A service is missing from the tools**: Does it show up under "Enabled
  services" in the add-on log? If not, double-check the URL/API key in
  the configuration and restart the add-on.
- **Portainer error "fetch failed" / TLS error**: Set
  `portainer_insecure_tls` to `true` (this is the default) – this affects
  self-signed certificates on home networks.
- **More details**: [DOCS.md](DOCS.md) for the full options reference,
  [README.md](README.md) for Docker/stdio alternatives.

---

Questions, bugs, or ideas? Feel free to open an
[issue on GitHub](https://github.com/theboringalex/TheBoringMCP/issues).
If TheBoringMCP saves you time:

<a href="https://www.buymeacoffee.com/theboringit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

## Deutsch

Diese Anleitung führt dich komplett von null bis zum fertig nutzbaren
MCP-Server in Claude – Schritt für Schritt, ohne Vorwissen nötig. Sie ist
für die Installation **als Home-Assistant-Add-on** geschrieben (der
empfohlene Weg); Alternativen (Docker-Container, lokal per stdio) stehen
in der [README.md](README.md).

Wenn du NGINX Proxy Manager oder Portainer noch nicht installiert hast,
zeigt dir diese Anleitung auch, wie du sie als Add-ons nachrüstest – beides
ist optional und nur nötig, wenn du die entsprechenden Funktionen nutzen
willst.

---

### Inhalt

1. [Was du am Ende hast](#1-was-du-am-ende-hast)
2. [Voraussetzungen](#2-voraussetzungen)
3. [Optional: Portainer installieren](#3-optional-portainer-installieren)
4. [Optional: NGINX Proxy Manager installieren](#4-optional-nginx-proxy-manager-installieren)
5. [TheBoringMCP installieren](#5-theboringmcp-installieren)
6. [Add-on konfigurieren](#6-add-on-konfigurieren)
7. [API-Keys & Tokens besorgen](#7-api-keys--tokens-besorgen)
8. [Add-on starten & prüfen](#8-add-on-starten--prüfen)
9. [Mit Claude verbinden](#9-mit-claude-verbinden)
10. [Fehlersuche](#10-fehlersuche)

---

### 1. Was du am Ende hast

Einen MCP-Server, der auf deiner Home-Assistant-NAS/Box läuft und Claude
vollen Zugriff auf dein HomeLab gibt: Home Assistant selbst, Portainer
(Docker), Sonarr, Radarr, SABnzbd, Jellyfin, Plex und GitHub. Du kannst
Claude danach z.B. bitten: *"Starte den Jellyfin-Container neu"*, *"Füge
die Serie XY zu Sonarr hinzu"* oder *"Erstelle eine neue Home-Assistant-
Automation, die abends das Licht dimmt"* – Claude erledigt es direkt.

### 2. Voraussetzungen

- Eine laufende **Home Assistant OS / Supervised**-Installation (Add-ons
  brauchen den Supervisor – reines "Home Assistant Container" ohne
  Supervisor funktioniert nicht für den Add-on-Weg, dann bitte den
  [Docker-Weg in der README](README.md#2-als-eigenständiger-docker-container)
  nutzen).
- Zugriff auf die Home-Assistant-Weboberfläche mit einem Admin-Account.
- Für die Dienste, die du anbinden willst (Portainer, Sonarr, Radarr,
  SABnzbd, Jellyfin, Plex, GitHub): diese sollten bereits laufen bzw. ein
  GitHub-Account vorhanden sein. Jeder Dienst ist optional – du kannst
  auch nur mit Home Assistant starten und später mehr hinzufügen.
- Ein Claude-Account mit [claude.ai](https://claude.ai) oder Claude
  Desktop (für die Connector-Einrichtung in Schritt 9).

### 3. Optional: Portainer installieren

Portainer verwaltet deine Docker-Container. Brauchst du nur, wenn du die
`portainer_*`-Tools (Container/Stacks/Images verwalten) nutzen willst.
Läuft Portainer bei dir schon (z.B. auf der NAS selbst), **überspringe
diesen Schritt**.

1. In Home Assistant: **Einstellungen → Add-ons → Add-on-Store**.
2. Rechts oben auf die drei Punkte (⋮) → **Repositories** → folgende URL
   eintragen und mit **Hinzufügen** bestätigen:
   ```
   https://github.com/portainer/portainer-ha-addon
   ```
   *(Falls dieses Repository bei dir nicht verfügbar ist: Portainer läuft
   genauso gut als eigenständiger Docker-Container direkt auf deiner NAS –
   die offizielle Anleitung dazu findest du unter
   [docs.portainer.io](https://docs.portainer.io/start/install-ce/server/docker).)*
3. Store neu laden (Seite aktualisieren), "Portainer" suchen, installieren,
   starten.
4. Portainer ist danach z.B. unter `https://<ha-ip>:9443` erreichbar.
   Beim ersten Aufruf legst du einen Admin-Benutzer an.
5. Notiere dir die URL – die brauchst du gleich in Schritt 6.

> **Hinweis zu selbstsignierten Zertifikaten:** Portainer nutzt im
> Heimnetz meist ein selbstsigniertes HTTPS-Zertifikat. TheBoringMCP
> akzeptiert das standardmäßig (`portainer_insecure_tls: true`) – du musst
> nichts weiter tun, außer du hast später ein echtes Zertifikat.

### 4. Optional: NGINX Proxy Manager installieren

NGINX Proxy Manager (NPM) brauchst du **nicht**, damit TheBoringMCP
funktioniert – im lokalen Netzwerk reicht `http://<ha-ip>:17820`. Sinnvoll
ist NPM, wenn du den MCP-Server unter einer eigenen Domain mit gültigem
TLS-Zertifikat erreichbar machen willst (z.B. um von unterwegs über
Claude Desktop zuzugreifen, ohne VPN).

1. **Einstellungen → Add-ons → Add-on-Store** → ⋮ → **Repositories** →
   folgende URL hinzufügen:
   ```
   https://github.com/hassio-addons/repository
   ```
2. Store neu laden, **"NGINX Proxy Manager"** suchen, installieren,
   starten.
3. Oberfläche über den Add-on-Info-Bereich öffnen (Standard-Login:
   `admin@example.com` / `changeme` – sofort ändern!).
4. **Proxy Hosts → Add Proxy Host**:
   - *Domain Names*: deine gewünschte Subdomain, z.B. `mcp.deinedomain.de`
   - *Scheme*: `http`
   - *Forward Hostname/IP*: die IP deiner Home-Assistant-Instanz
   - *Forward Port*: `17820`
   - Unter dem Reiter **SSL**: *Request a new SSL Certificate* (Let's
     Encrypt) aktivieren, *Force SSL* anhaken.
5. Speichern. Der MCP-Server ist danach auch unter
   `https://mcp.deinedomain.de/` erreichbar.

Voraussetzung dafür ist, dass die Domain per DNS auf deine öffentliche
IP zeigt und Port 443 (und ggf. 80 für die Zertifikatsprüfung) in deiner
Fritzbox/Router auf die Home-Assistant-Box weitergeleitet ist.

### 5. TheBoringMCP installieren

1. **Einstellungen → Add-ons → Add-on-Store** → ⋮ → **Repositories** →
   folgende URL eintragen:
   ```
   https://github.com/theboringalex/TheBoringMCP
   ```
2. Store-Seite neu laden (F5). "TheBoringMCP" sollte jetzt auftauchen
   (ggf. ganz unten unter den lokalen/zusätzlichen Add-ons).
3. Öffnen → **Installieren** klicken. Das dauert je nach Hardware ein paar
   Minuten (der Container wird beim ersten Mal aus dem Quellcode gebaut).

### 6. Add-on konfigurieren

Nach der Installation zum Reiter **Konfiguration** des Add-ons wechseln.
Du siehst eine Liste von Optionen – **alles ist optional außer
`mcp_http_token`**. Trage nur ein, was du auch nutzen willst; fehlende
Zeilen einfach leer lassen, der zugehörige Dienst wird dann automatisch
übersprungen (steht auch im Add-on-Log beim Start).

| Option | Pflicht? | Was rein muss |
|---|---|---|
| `mcp_http_token` | **Ja** | Ein selbst ausgedachtes, langes zufälliges Passwort (z.B. per Passwort-Generator, 32+ Zeichen). Schützt den gesamten Server. |
| `read_only` | Nein | `true`, wenn Claude **nur lesen**, aber nichts ändern/steuern darf. Standard: `false`. |
| `ha_url`, `ha_token` | Nein | Nur nötig für eine **externe** Home-Assistant-Instanz. Läuft das Add-on auf derselben HA-Instanz (Normalfall), bitte **leer lassen** – der Zugriff erfolgt dann automatisch über den Supervisor. |
| `portainer_url`, `portainer_api_key` | Nein | Portainer-URL und API-Key, siehe Schritt 7. |
| `portainer_insecure_tls` | Nein | Standard `true` (siehe Hinweis oben zu selbstsignierten Zertifikaten). |
| `sonarr_url`, `sonarr_api_key` | Nein | Siehe Schritt 7. |
| `radarr_url`, `radarr_api_key` | Nein | Siehe Schritt 7. |
| `sabnzbd_url`, `sabnzbd_api_key` | Nein | Siehe Schritt 7. |
| `jellyfin_url`, `jellyfin_api_key` | Nein | Siehe Schritt 7. |
| `plex_url`, `plex_token` | Nein | Siehe Schritt 7. |
| `github_token`, `github_api_url` | Nein | Siehe Schritt 7. `github_api_url` nur für GitHub Enterprise Server nötig. |

### 7. API-Keys & Tokens besorgen

Nur die Dienste ausfüllen, die du wirklich anbinden willst.

- **Portainer**: In Portainer oben rechts auf deinen Benutzernamen →
  **My account** → **Access tokens** → **Add access token** → Namen
  vergeben → erzeugten Token kopieren (wird nur einmal angezeigt!).
- **Sonarr / Radarr / SABnzbd**: In der jeweiligen App unter
  **Settings → General** (bei SABnzbd: **Config → General**) steht der
  API-Key direkt sichtbar.
- **Jellyfin**: **Dashboard → API Keys → +** → Namen vergeben → Key
  kopieren.
- **Plex**: Ein beliebiges Medienelement in der Plex-Web-App öffnen →
  "..." (drei Punkte) → **Info abrufen** → **XML anzeigen** – in der sich
  öffnenden URL steht `...&X-Plex-Token=DEIN_TOKEN`. Ausführliche
  Anleitung: [offizieller Plex-Support-Artikel](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/).
- **GitHub**: [github.com/settings/tokens](https://github.com/settings/tokens)
  → **Generate new token** (fine-grained, mit Zugriff nur auf die
  gewünschten Repos, empfohlen) oder klassisch mit Scope `repo`.

### 8. Add-on starten & prüfen

1. Konfiguration speichern (**Speichern**-Button im Konfiguration-Reiter).
2. Zum Reiter **Info** wechseln, **Start** klicken.
3. Im Reiter **Log** sollte etwas wie
   ```
   TheBoringMCP v1.0.0 gestartet (Transport: http, Port: 17820)
   Aktivierte Dienste: home-assistant, portainer, ...
   ```
   erscheinen – die Liste zeigt genau die Dienste, für die du oben
   gültige Zugangsdaten eingetragen hast.
4. Taucht ein Fehler zu einem bestimmten Dienst auf (z.B. falsche URL),
   die betreffende Konfigurationszeile prüfen – der Server startet
   trotzdem, nur der fehlerhafte Dienst bleibt inaktiv.

### 9. Mit Claude verbinden

Wichtig: **Home Assistant allein bringt schon ~80 Tools mit.** Ein Claude-
Connector darf aber maximal 100 Tools haben. Deshalb bietet der Server
**zwei separate Pfade** an, die als **zwei eigene Connectoren** angelegt
werden – beide mit demselben Token:

| Connector-Name (frei wählbar) | URL | Enthält |
|---|---|---|
| TheBoringMCP – Home Assistant | `http://<home-assistant-ip>:17820/` | nur Home Assistant |
| TheBoringMCP – Rest | `http://<home-assistant-ip>:17820/rest` | Portainer, Sonarr, Radarr, SABnzbd, Jellyfin, Plex, GitHub |

So richtest du beide ein (in [claude.ai](https://claude.ai) oder Claude
Desktop):

1. **Einstellungen → Connectors → Connector hinzufügen** (bzw.
   "Add custom connector").
2. Namen vergeben (z.B. "HomeLab – Home Assistant"), als URL
   `http://<home-assistant-ip>:17820/` eintragen.
3. Bei den Headern: `Authorization` = `Bearer <dein mcp_http_token>`
   (also z.B. `Bearer mEinSuperGeheimesPasswort123`).
4. Speichern – der Connector sollte sich sofort verbinden.
5. Schritt 1–4 **wiederholen** für den zweiten Connector, diesmal mit der
   URL `http://<home-assistant-ip>:17820/rest`.

Nutzt du NGINX Proxy Manager (Schritt 4), kannst du statt der IP auch
deine Domain verwenden, z.B. `https://mcp.deinedomain.de/` und
`https://mcp.deinedomain.de/rest`.

Fertig – frag Claude jetzt einfach etwas wie *"Welche Docker-Container
laufen gerade?"* oder *"Zeig mir den Status aller Home-Assistant-
Lichter"*.

### 10. Fehlersuche

- **Connector verbindet sich nicht**: Ist die IP/Domain von deinem
  Claude-Client aus erreichbar? Stimmt der `Authorization`-Header exakt
  (inkl. `Bearer ` mit Leerzeichen)? Läuft das Add-on (Reiter *Info*)?
- **Ein Dienst fehlt in den Tools**: Steht im Add-on-Log unter
  "Aktivierte Dienste"? Falls nicht, URL/API-Key in der Konfiguration
  nochmal prüfen und Add-on neu starten.
- **Portainer-Fehler "fetch failed" / TLS-Fehler**: `portainer_insecure_tls`
  auf `true` setzen (ist der Standard) – betrifft selbstsignierte
  Zertifikate im Heimnetz.
- **Mehr Details**: [DOCS.md](DOCS.md) für die vollständige
  Options-Referenz, [README.md](README.md) für Docker-/stdio-Alternativen.

---

Fragen, Bugs oder Ideen? Gerne ein [Issue auf GitHub](https://github.com/theboringalex/TheBoringMCP/issues)
öffnen. Wenn dir TheBoringMCP Zeit spart:

<a href="https://www.buymeacoffee.com/theboringit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>
