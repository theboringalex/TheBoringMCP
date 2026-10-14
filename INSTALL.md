# Installation Guide – TheBoringMCP v2

🇬🇧 **[English](#english)** · 🇩🇪 **[Deutsch](#deutsch)**

---

## English

*A guide for complete beginners. No programming knowledge needed. Take your time – every step is small.*

### Contents

1. [What you need](#en-1)
2. [Install the add-on](#en-2)
3. [Set it up (settings page)](#en-3)
4. [Where do I find the API keys?](#en-4)
5. [Connect Claude](#en-5)
6. [Reach it from outside (optional)](#en-6)
7. [Try it](#en-7)
8. [Something does not work?](#en-8)
9. [Words explained](#en-9)

<a id="en-1"></a>
### 1. What you need

- A running **Home Assistant** with the **Add-on Store** (Home Assistant OS or Supervised).
- A **Claude account** at [claude.ai](https://claude.ai) (custom connectors need a paid plan) – or Claude Desktop / Claude Code.
- The programs you want Claude to control (Sonarr, Radarr, …). **You do not need all of them** – every program has an on/off switch.
- For each program you need its **address** (like `http://192.168.1.20:8989`) and an **API key** – section 4 shows where to find them.

<a id="en-2"></a>
### 2. Install the add-on

1. Click this button (it opens your Home Assistant):

   [![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftheboringalex%2FTheBoringMCP)

   Not working? Do it by hand: **Settings → Add-ons → Add-on Store → ⋮ (top right) → Repositories**, paste `https://github.com/theboringalex/TheBoringMCP`, click **Add**.
2. Reload the page, find **TheBoringMCP** in the store, click it, then **Install**.
3. Turn on **Show in sidebar** and **Start on boot**, then click **Start**.

<a id="en-3"></a>
### 3. Set it up (settings page)

Open **TheBoringMCP** in the Home Assistant sidebar. You see one card per program, with its logo and an **on/off switch**:

1. **Password (token):** in the first card click **Generate**. This is the password Claude will need. Keep it – you will paste it into Claude in step 5.
2. **Switch on** every program you use and **switch off** the others (a switched-off program is invisible to Claude).
3. Fill in **Address** and **API key** for each program (section 4 tells you where to find them).
4. Press **Test connection** on each card. You should see a green ✔. A red ✖ tells you what is wrong (wrong address? wrong key?).
5. Click **Save & restart** at the bottom. The add-on restarts in about 10 seconds.

💡 **Home Assistant** needs no address or key – it connects automatically.
💡 **Read-only mode:** switch it on if you want Claude to only *look* and never change anything.
💡 You can also use the normal add-on **Configuration** tab – it shows the same settings.

<a id="en-4"></a>
### 4. Where do I find the API keys?

| Program | Address looks like | Where is the key? |
|---|---|---|
| Sonarr | `http://192.168.1.20:8989` | Sonarr → *Settings → General → Security → API Key* |
| Radarr | `http://192.168.1.20:7878` | Radarr → *Settings → General → Security → API Key* |
| SABnzbd | `http://192.168.1.20:8080` | SABnzbd → *Config → General → Security → API Key* |
| Jellyfin | `http://192.168.1.20:8096` | Jellyfin → *Dashboard → API Keys → +* |
| Portainer | `https://192.168.1.20:9443` | Portainer → click your name → *My account → Access tokens → Add* (copy it right away – it is shown only once) |
| UniFi | `https://192.168.1.1` (your gateway / UniFi console) | UniFi → *Settings → Control Plane → Integrations → Create API Key* |
| n8n | `http://192.168.1.20:5678` | n8n → *Settings → n8n API → Create an API key* |
| Home Assistant | – (automatic) | – |

Tip: use the **IP address** of the computer where the program runs, not `localhost`.

<a id="en-5"></a>
### 5. Connect Claude

**Why one connector per program?** Claude.ai allows about 100 tools per connector. TheBoringMCP has over 340 in total, but **no single program has more than 100** (Home Assistant has the most with 78). So you create **one connector per program you use** – all with the same password:

| Name (your choice) | Address |
|---|---|
| Home Assistant | `https://mcp.example.com/ha` |
| Sonarr | `https://mcp.example.com/sonarr` |
| Radarr | `https://mcp.example.com/radarr` |
| SABnzbd | `https://mcp.example.com/sabnzbd` |
| Jellyfin | `https://mcp.example.com/jellyfin` |
| Portainer | `https://mcp.example.com/portainer` |
| UniFi | `https://mcp.example.com/unifi` |
| n8n | `https://mcp.example.com/n8n` |

(Replace `https://mcp.example.com` with your own address – see section 6. At home you can use `http://<home-assistant-ip>:17820`.)

In [claude.ai](https://claude.ai): **Settings → Connectors → Add custom connector** → enter name and address → add the header `Authorization` with the value `Bearer <your password>` (the word *Bearer*, a space, then the password from step 3) → **Save**.

With **Claude Desktop / Claude Code** you can use the single address `/` which contains everything (they have no tool limit).

<a id="en-6"></a>
### 6. Reach it from outside (optional)

At home, `http://<home-assistant-ip>:17820` is enough. For Claude.ai on the internet you need a secure (HTTPS) address. With the **Nginx Proxy Manager** add-on:

1. In your domain provider (e.g. Cloudflare) create a name such as `mcp.example.com` that points to your home address.
2. In Nginx Proxy Manager: **Proxy Hosts → Add Proxy Host**
   - *Domain Names:* `mcp.example.com`
   - *Scheme:* `http` · *Forward Hostname/IP:* IP of your Home Assistant · *Forward Port:* `17820`
   - Turn on **Websockets Support**
   - Tab **SSL:** *Request a new SSL certificate*, *Force SSL*
   - Tab **Advanced:** paste
```
proxy_buffering off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
chunked_transfer_encoding off;
```
3. **One name is enough** – all the paths (`/ha`, `/sonarr`, `/radarr` …) use it.

⚠️ Never open port 17820 directly in your router. Always use HTTPS and the password.

<a id="en-7"></a>
### 7. Try it

Open a new chat with Claude, enable your connector and ask for example:

- *"Which containers are running in Portainer?"*
- *"Add the movie Dune to Radarr in the best quality profile."*
- *"What is downloading in SABnzbd right now?"*
- *"Create a firewall rule that blocks the IoT network from reaching my LAN."*
- *"List my n8n workflows and tell me which ones failed this week."*

<a id="en-8"></a>
### 8. Something does not work?

| Problem | What to do |
|---|---|
| Red ✖ "not reachable" on *Test connection* | Check IP and port. Open the address in your browser – do you see the program? Use the IP, not `localhost`. |
| Red ✖ "access denied" | The API key is wrong or was copied with a space. Create a new key and paste again. |
| Claude says "connector failed" | Is the add-on running (Info tab)? Is the header exactly `Bearer ` + password? Did you use the right path (`/arr` etc.)? |
| A program is missing in Claude | Is its switch on, and is it set up (green "ready")? Press *Save & restart*. |
| "Too many tools" | One connector may contain at most ~100 tools. Use one connector per program (section 5). |
| 403 from the internet | Your domain provider (e.g. Cloudflare "Bot Fight Mode"/WAF) may block Claude. Allow the path in a skip rule. |
| Still stuck | Add-on → **Log** tab, then [open an issue](https://github.com/theboringalex/TheBoringMCP/issues) (never post your keys!). |

<a id="en-9"></a>
### 9. Words explained

- **MCP server** – a "plug" that lets Claude use other programs.
- **Connector** – the entry in Claude that points to an MCP server.
- **API key / token** – a long password a program creates for other programs.
- **Add-on** – an app that runs inside Home Assistant.
- **Reverse proxy** – a doorman that gives your server a safe https address.

---

Questions, bugs or ideas? [Open an issue](https://github.com/theboringalex/TheBoringMCP/issues). If TheBoringMCP saves you time:

<a href="https://www.buymeacoffee.com/theboringit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>

---

## Deutsch

*Eine Anleitung für absolute Einsteiger. Programmierkenntnisse sind nicht nötig. Lass dir Zeit – jeder Schritt ist klein.*

### Inhalt

1. [Was du brauchst](#de-1)
2. [Add-on installieren](#de-2)
3. [Einrichten (Einstellungsseite)](#de-3)
4. [Wo finde ich die API-Schlüssel?](#de-4)
5. [Claude verbinden](#de-5)
6. [Von außen erreichbar machen (optional)](#de-6)
7. [Ausprobieren](#de-7)
8. [Es klappt etwas nicht?](#de-8)
9. [Begriffe erklärt](#de-9)

<a id="de-1"></a>
### 1. Was du brauchst

- Ein laufendes **Home Assistant** mit **Add-on-Store** (Home Assistant OS oder Supervised).
- Einen **Claude-Account** bei [claude.ai](https://claude.ai) (eigene Connectors brauchen einen Bezahl-Tarif) – oder Claude Desktop / Claude Code.
- Die Programme, die Claude steuern soll (Sonarr, Radarr, …). **Du brauchst nicht alle** – jedes Programm hat einen Ein/Aus-Schalter.
- Zu jedem Programm brauchst du die **Adresse** (z. B. `http://192.168.1.20:8989`) und einen **API-Schlüssel** – Abschnitt 4 zeigt, wo du beides findest.

<a id="de-2"></a>
### 2. Add-on installieren

1. Klicke auf diesen Knopf (er öffnet dein Home Assistant):

   [![Open your Home Assistant instance and show the add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftheboringalex%2FTheBoringMCP)

   Klappt nicht? Dann von Hand: **Einstellungen → Add-ons → Add-on-Store → ⋮ (oben rechts) → Repositories**, `https://github.com/theboringalex/TheBoringMCP` einfügen, **Hinzufügen**.
2. Seite neu laden, **TheBoringMCP** im Store suchen, anklicken, **Installieren**.
3. **In Seitenleiste anzeigen** und **Beim Systemstart starten** einschalten, dann auf **Starten** klicken.

<a id="de-3"></a>
### 3. Einrichten (Einstellungsseite)

Öffne **TheBoringMCP** in der Seitenleiste von Home Assistant. Du siehst für jedes Programm eine Karte mit Logo und **Ein/Aus-Schalter**:

1. **Passwort (Token):** In der ersten Karte auf **Erzeugen** klicken. Das ist das Passwort, das Claude braucht. Merk es dir – du fügst es in Schritt 5 bei Claude ein.
2. **Schalte jedes Programm ein, das du nutzt**, und die anderen **aus** (ein ausgeschaltetes Programm ist für Claude unsichtbar).
3. Trage bei jedem Programm **Adresse** und **API-Schlüssel** ein (Abschnitt 4 zeigt, wo du sie findest).
4. Drücke bei jeder Karte auf **Verbindung testen**. Du solltest ein grünes ✔ sehen. Ein rotes ✖ sagt dir, was nicht stimmt (falsche Adresse? falscher Schlüssel?).
5. Unten auf **Speichern & neu starten** klicken. Das Add-on startet in ca. 10 Sekunden neu.

💡 **Home Assistant** braucht weder Adresse noch Schlüssel – es verbindet sich automatisch.
💡 **Nur-Lesen-Modus:** einschalten, wenn Claude nur *ansehen* und nie etwas ändern soll.
💡 Du kannst auch den normalen Reiter **Konfiguration** des Add-ons nutzen – dort stehen dieselben Einstellungen.

<a id="de-4"></a>
### 4. Wo finde ich die API-Schlüssel?

| Programm | Adresse sieht so aus | Wo ist der Schlüssel? |
|---|---|---|
| Sonarr | `http://192.168.1.20:8989` | Sonarr → *Einstellungen → Allgemein → Sicherheit → API-Schlüssel* |
| Radarr | `http://192.168.1.20:7878` | Radarr → *Einstellungen → Allgemein → Sicherheit → API-Schlüssel* |
| SABnzbd | `http://192.168.1.20:8080` | SABnzbd → *Einstellungen → Allgemein → Sicherheit → API-Schlüssel* |
| Jellyfin | `http://192.168.1.20:8096` | Jellyfin → *Dashboard → API-Schlüssel → +* |
| Portainer | `https://192.168.1.20:9443` | Portainer → auf deinen Namen klicken → *Mein Konto → Zugriffstoken → Hinzufügen* (sofort kopieren – er wird nur einmal angezeigt) |
| UniFi | `https://192.168.1.1` (dein Gateway / deine UniFi-Konsole) | UniFi → *Einstellungen → Control Plane → Integrationen → API-Schlüssel erstellen* |
| n8n | `http://192.168.1.20:5678` | n8n → *Einstellungen → n8n API → API-Schlüssel erstellen* |
| Home Assistant | – (automatisch) | – |

Tipp: Nimm die **IP-Adresse** des Rechners, auf dem das Programm läuft – nicht `localhost`.

<a id="de-5"></a>
### 5. Claude verbinden

**Warum ein Connector pro Programm?** Claude.ai erlaubt etwa 100 Tools pro Connector. TheBoringMCP hat insgesamt über 340, aber **kein einzelnes Programm hat mehr als 100** (Home Assistant hat mit 78 die meisten). Du legst also **pro genutztem Programm einen Connector** an – überall mit demselben Passwort:

| Name (frei wählbar) | Adresse |
|---|---|
| Home Assistant | `https://mcp.example.com/ha` |
| Sonarr | `https://mcp.example.com/sonarr` |
| Radarr | `https://mcp.example.com/radarr` |
| SABnzbd | `https://mcp.example.com/sabnzbd` |
| Jellyfin | `https://mcp.example.com/jellyfin` |
| Portainer | `https://mcp.example.com/portainer` |
| UniFi | `https://mcp.example.com/unifi` |
| n8n | `https://mcp.example.com/n8n` |

(Ersetze `https://mcp.example.com` durch deine eigene Adresse – siehe Abschnitt 6. Zuhause geht `http://<home-assistant-ip>:17820`.)

In [claude.ai](https://claude.ai): **Einstellungen → Connectors → Benutzerdefinierten Connector hinzufügen** → Name und Adresse eintragen → Header `Authorization` mit dem Wert `Bearer <dein Passwort>` hinzufügen (das Wort *Bearer*, ein Leerzeichen, dann das Passwort aus Schritt 3) → **Speichern**.

Mit **Claude Desktop / Claude Code** reicht die eine Adresse `/` mit allem (dort gibt es kein Tool-Limit).

<a id="de-6"></a>
### 6. Von außen erreichbar machen (optional)

Zuhause genügt `http://<home-assistant-ip>:17820`. Für Claude.ai im Internet brauchst du eine sichere (HTTPS-)Adresse. Mit dem Add-on **Nginx Proxy Manager**:

1. Lege bei deinem Domain-Anbieter (z. B. Cloudflare) einen Namen wie `mcp.example.com` an, der auf deinen Heimanschluss zeigt.
2. In Nginx Proxy Manager: **Proxy Hosts → Add Proxy Host**
   - *Domain Names:* `mcp.example.com`
   - *Scheme:* `http` · *Forward Hostname/IP:* IP deines Home Assistant · *Forward Port:* `17820`
   - **Websockets Support** einschalten
   - Reiter **SSL:** *Request a new SSL certificate*, *Force SSL*
   - Reiter **Advanced:** einfügen
```
proxy_buffering off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
chunked_transfer_encoding off;
```
3. **Ein Name genügt** – alle Pfade (`/ha`, `/sonarr`, `/radarr` …) laufen darüber.

⚠️ Öffne Port 17820 nie direkt im Router. Immer HTTPS und Passwort nutzen.

<a id="de-7"></a>
### 7. Ausprobieren

Starte einen neuen Chat mit Claude, schalte deinen Connector ein und frage zum Beispiel:

- *„Welche Container laufen in Portainer?"*
- *„Füge den Film Dune zu Radarr hinzu, im besten Qualitätsprofil."*
- *„Was lädt SABnzbd gerade herunter?"*
- *„Lege eine Firewall-Regel an, die das IoT-Netz vom LAN abschottet."*
- *„Liste meine n8n-Workflows und sag mir, welche diese Woche fehlgeschlagen sind."*

<a id="de-8"></a>
### 8. Es klappt etwas nicht?

| Problem | Was tun |
|---|---|
| Rotes ✖ „nicht erreichbar" bei *Verbindung testen* | IP und Port prüfen. Öffne die Adresse im Browser – siehst du das Programm? IP nehmen, nicht `localhost`. |
| Rotes ✖ „Zugriff verweigert" | Der API-Schlüssel ist falsch oder wurde mit Leerzeichen kopiert. Neuen Schlüssel erzeugen und einfügen. |
| Claude meldet „Connector fehlgeschlagen" | Läuft das Add-on (Reiter Info)? Lautet der Header genau `Bearer ` + Passwort? Stimmt der Pfad (`/arr` usw.)? |
| Ein Programm fehlt bei Claude | Ist sein Schalter an und ist es eingerichtet (grün „bereit")? *Speichern & neu starten* drücken. |
| „Zu viele Tools" | Ein Connector darf höchstens ~100 Tools enthalten. Nutze einen Connector pro Programm (Abschnitt 5). |
| 403 aus dem Internet | Dein Domain-Anbieter (z. B. Cloudflare „Bot Fight Mode"/WAF) blockiert evtl. Claude. Pfad in einer Skip-Regel erlauben. |
| Weiter ratlos | Add-on → Reiter **Protokoll**, dann [Issue öffnen](https://github.com/theboringalex/TheBoringMCP/issues) (poste nie deine Schlüssel!). |

<a id="de-9"></a>
### 9. Begriffe erklärt

- **MCP-Server** – ein „Stecker", mit dem Claude andere Programme benutzen kann.
- **Connector** – der Eintrag in Claude, der auf einen MCP-Server zeigt.
- **API-Schlüssel / Token** – ein langes Passwort, das ein Programm für andere Programme erzeugt.
- **Add-on** – eine App, die innerhalb von Home Assistant läuft.
- **Reverse Proxy** – ein Türsteher, der deinem Server eine sichere https-Adresse gibt.

---

Fragen, Fehler oder Ideen? [Issue öffnen](https://github.com/theboringalex/TheBoringMCP/issues). Wenn dir TheBoringMCP Zeit spart:

<a href="https://www.buymeacoffee.com/theboringit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" ></a>
