/** Die Einstellungsseite (HTML + CSS + JS in einer Datei, keine Abhängigkeiten). */
export const PAGE_HTML = String.raw`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TheBoringMCP</title>
<style>
  :root { --bg:#f4f6fa; --card:#fff; --text:#1c2230; --muted:#667085; --line:#e3e7ef; --accent:#3b82f6; --ok:#16a34a; --bad:#dc2626; --warn:#d97706; }
  @media (prefers-color-scheme: dark) { :root { --bg:#12151c; --card:#1b2029; --text:#e8ecf4; --muted:#9aa4b5; --line:#2b3240; --accent:#60a5fa; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 20px 16px 120px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  .sub { color: var(--muted); margin: 0 0 20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; margin:0 0 16px; }
  .card.off { opacity:.62; }
  .head { display:flex; align-items:center; gap:14px; }
  .logo { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:26px; background:var(--bg); flex:none; overflow:hidden; }
  .logo img { width:36px; height:36px; object-fit:contain; }
  .title { flex:1; min-width:0; }
  .title b { font-size:1.08rem; }
  .title small { display:block; color:var(--muted); }
  .switch { position:relative; width:50px; height:28px; flex:none; }
  .switch input { opacity:0; width:0; height:0; }
  .slider { position:absolute; inset:0; background:#9aa4b5; border-radius:28px; transition:.2s; cursor:pointer; }
  .slider:before { content:""; position:absolute; height:22px; width:22px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s; }
  input:checked + .slider { background:var(--ok); }
  input:checked + .slider:before { transform:translateX(22px); }
  .body { margin-top:14px; border-top:1px solid var(--line); padding-top:14px; }
  .card.off .body { display:none; }
  label { display:block; font-weight:600; margin:10px 0 3px; }
  .hint { color:var(--muted); font-size:.86rem; margin:2px 0 0; }
  input[type=text], input[type=password], input[type=url] { width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:9px; background:var(--bg); color:var(--text); font:inherit; }
  .row { display:flex; gap:8px; align-items:center; }
  .row input[type=text], .row input[type=password] { flex:1; }
  .check { display:flex; gap:9px; align-items:flex-start; margin-top:12px; }
  .check input { margin-top:5px; }
  button { font:inherit; border:0; border-radius:9px; padding:9px 14px; cursor:pointer; background:var(--accent); color:#fff; font-weight:600; }
  button.ghost { background:transparent; color:var(--accent); border:1px solid var(--accent); }
  button:disabled { opacity:.5; cursor:default; }
  .pill { display:inline-block; font-size:.78rem; font-weight:600; padding:2px 9px; border-radius:20px; background:var(--bg); color:var(--muted); }
  .pill.ok { background:#dcfce7; color:#166534; } .pill.bad { background:#fee2e2; color:#991b1b; } .pill.warn { background:#fef3c7; color:#92400e; }
  .test { margin-top:14px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .bar { position:fixed; left:0; right:0; bottom:0; background:var(--card); border-top:1px solid var(--line); padding:12px 16px; display:flex; gap:12px; justify-content:center; align-items:center; flex-wrap:wrap; }
  code { background:var(--bg); padding:1px 6px; border-radius:6px; }
  table { width:100%; border-collapse:collapse; font-size:.9rem; }
  td { padding:5px 4px; border-top:1px solid var(--line); vertical-align:top; }
  .msg { font-weight:600; }
</style>
</head>
<body>
<main>
  <h1>TheBoringMCP <span class="pill" id="ver"></span></h1>
  <p class="sub" id="sub"></p>

  <div class="card" id="general"></div>
  <div id="services"></div>
  <div class="card" id="paths"></div>
</main>
<div class="bar">
  <span class="msg" id="msg"></span>
  <button id="save"></button>
</div>

<script>
(function () {
  var DE = (navigator.language || "en").toLowerCase().indexOf("de") === 0;
  function t(de, en) { return DE ? de : en; }
  var BASE = location.pathname.replace(/\/?$/, "/");
  var ICON = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/";

  var SERVICES = [
    { id: "ha", name: "Home Assistant", emoji: "🏠", icon: "home-assistant",
      de: "Dein Smart Home: Geräte steuern, Automationen, Dashboards. Läuft als Add-on automatisch – meistens musst du hier nichts eintragen.",
      en: "Your smart home: control devices, automations, dashboards. Works automatically as an add-on – usually you do not need to enter anything.",
      fields: [
        { k: "ha_url", de: "Adresse (optional)", en: "Address (optional)", ph: "http://192.168.1.10:8123", hde: "Leer lassen = automatisch.", hen: "Leave empty = automatic." },
        { k: "ha_token", secret: true, de: "Langzeit-Zugriffstoken (optional)", en: "Long-lived access token (optional)", hde: "Nur nötig, wenn die Adresse oben gesetzt ist. Erstellen: Profil → Sicherheit.", hen: "Only needed if you set the address above. Create it under Profile → Security." } ] },
    { id: "sonarr", name: "Sonarr", emoji: "📺", icon: "sonarr",
      de: "Verwaltet deine Serien und lädt neue Folgen automatisch.", en: "Manages your TV shows and fetches new episodes automatically.",
      fields: [ { k: "sonarr_url", de: "Adresse", en: "Address", ph: "http://192.168.1.20:8989" },
        { k: "sonarr_api_key", secret: true, de: "API-Schlüssel", en: "API key", hde: "In Sonarr: Einstellungen → Allgemein → Sicherheit.", hen: "In Sonarr: Settings → General → Security." } ] },
    { id: "radarr", name: "Radarr", emoji: "🎬", icon: "radarr",
      de: "Verwaltet deine Filme und lädt neue automatisch.", en: "Manages your movies and fetches new ones automatically.",
      fields: [ { k: "radarr_url", de: "Adresse", en: "Address", ph: "http://192.168.1.20:7878" },
        { k: "radarr_api_key", secret: true, de: "API-Schlüssel", en: "API key", hde: "In Radarr: Einstellungen → Allgemein → Sicherheit.", hen: "In Radarr: Settings → General → Security." } ] },
    { id: "sabnzbd", name: "SABnzbd", emoji: "⬇️", icon: "sabnzbd",
      de: "Der Download-Client für Usenet.", en: "The Usenet download client.",
      fields: [ { k: "sabnzbd_url", de: "Adresse", en: "Address", ph: "http://192.168.1.20:8080" },
        { k: "sabnzbd_api_key", secret: true, de: "API-Schlüssel", en: "API key", hde: "In SABnzbd: Einstellungen → Allgemein → Sicherheit → API-Schlüssel.", hen: "In SABnzbd: Config → General → Security → API Key." } ] },
    { id: "jellyfin", name: "Jellyfin", emoji: "🍿", icon: "jellyfin",
      de: "Dein Medienserver für Filme, Serien und Musik.", en: "Your media server for movies, shows and music.",
      fields: [ { k: "jellyfin_url", de: "Adresse", en: "Address", ph: "http://192.168.1.20:8096" },
        { k: "jellyfin_api_key", secret: true, de: "API-Schlüssel", en: "API key", hde: "In Jellyfin: Dashboard → API-Schlüssel → neuen Schlüssel erstellen.", hen: "In Jellyfin: Dashboard → API Keys → create a new key." } ] },
    { id: "portainer", name: "Portainer", emoji: "🐳", icon: "portainer",
      de: "Die Oberfläche für deine Docker-Container.", en: "The web interface for your Docker containers.",
      fields: [ { k: "portainer_url", de: "Adresse", en: "Address", ph: "https://192.168.1.20:9443" },
        { k: "portainer_api_key", secret: true, de: "Zugriffstoken", en: "Access token", hde: "In Portainer: Mein Konto → Zugriffstoken → hinzufügen.", hen: "In Portainer: My account → Access tokens → add." },
        { k: "portainer_insecure_tls", bool: true, de: "Selbstsigniertes Zertifikat akzeptieren", en: "Accept self-signed certificate", hde: "Im Heimnetz meist nötig (Standard: an).", hen: "Usually needed on a home network (default: on)." } ] },
    { id: "unifi", name: "UniFi", emoji: "🛜", icon: "unifi",
      de: "Dein UniFi-Gateway: Netzwerke, WLAN, Firewall, Geräte und Clients.", en: "Your UniFi gateway: networks, Wi-Fi, firewall, devices and clients.",
      fields: [ { k: "unifi_url", de: "Adresse des Gateways / der UniFi-Konsole", en: "Address of the gateway / UniFi console", ph: "https://192.168.1.1" },
        { k: "unifi_api_key", secret: true, de: "API-Schlüssel", en: "API key", hde: "In UniFi: Einstellungen → Control Plane → Integrationen → API-Schlüssel erstellen.", hen: "In UniFi: Settings → Control Plane → Integrations → create API key." },
        { k: "unifi_insecure_tls", bool: true, de: "Selbstsigniertes Zertifikat akzeptieren", en: "Accept self-signed certificate", hde: "UniFi-Geräte nutzen fast immer eins (Standard: an).", hen: "UniFi devices almost always use one (default: on)." } ] },
    { id: "n8n", name: "n8n", emoji: "🔗", icon: "n8n",
      de: "Automatisierung: Workflows bauen, starten und überwachen.", en: "Automation: build, run and monitor workflows.",
      fields: [ { k: "n8n_url", de: "Adresse", en: "Address", ph: "http://192.168.1.20:5678" },
        { k: "n8n_api_key", secret: true, de: "API-Schlüssel", en: "API key", hde: "In n8n: Einstellungen → n8n API → API-Schlüssel erstellen.", hen: "In n8n: Settings → n8n API → create an API key." } ] }
  ];

  var PATHS = [
    ["/", t("Alles (für Claude Desktop / Claude Code, kein Tool-Limit)", "Everything (Claude Desktop / Claude Code, no tool limit)")],
    ["/ha", "Home Assistant"], ["/sonarr", "Sonarr"], ["/radarr", "Radarr"], ["/sabnzbd", "SABnzbd"], ["/jellyfin", "Jellyfin"], ["/portainer", "Portainer"], ["/unifi", "UniFi"], ["/n8n", "n8n"]
  ];

  var state = { options: {}, secretSet: {}, edited: {}, version: "" };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (a) {
      if (a === "text") e.textContent = attrs[a]; else if (a === "class") e.className = attrs[a]; else e.setAttribute(a, attrs[a]);
    });
    (kids || []).forEach(function (k) { e.appendChild(k); });
    return e;
  }
  function setMsg(text, cls) { var m = $("msg"); m.textContent = text || ""; m.style.color = cls === "bad" ? "var(--bad)" : cls === "ok" ? "var(--ok)" : "var(--muted)"; }

  function field(f, svcId) {
    var wrap = el("div");
    if (f.bool) {
      var cb = el("input", { type: "checkbox", id: "f_" + f.k });
      cb.checked = state.options[f.k] !== false;
      cb.onchange = function () { state.edited[f.k] = cb.checked; };
      var lab = el("div", {}, [el("b", { text: DE ? f.de : f.en })]);
      if (f.hde) lab.appendChild(el("div", { class: "hint", text: DE ? f.hde : f.hen }));
      wrap.appendChild(el("div", { class: "check" }, [cb, lab]));
      return wrap;
    }
    wrap.appendChild(el("label", { for: "f_" + f.k, text: DE ? f.de : f.en }));
    var inp = el("input", { type: f.secret ? "password" : "text", id: "f_" + f.k, autocomplete: "off", spellcheck: "false" });
    if (f.secret) {
      inp.placeholder = state.secretSet[f.k] ? t("•••••• gespeichert – leer lassen zum Behalten", "•••••• saved – leave empty to keep") : t("Hier einfügen", "Paste here");
    } else {
      inp.value = state.options[f.k] || "";
      if (f.ph) inp.placeholder = f.ph;
    }
    inp.oninput = function () { state.edited[f.k] = inp.value; };
    wrap.appendChild(inp);
    if (f.hde) wrap.appendChild(el("div", { class: "hint", text: DE ? f.hde : f.hen }));
    return wrap;
  }

  function currentValues(svc) {
    var v = {};
    svc.fields.forEach(function (f) {
      var node = $("f_" + f.k);
      v[f.k] = f.bool ? node.checked : node.value;
    });
    return v;
  }

  function card(svc) {
    var enabledKey = svc.id + "_enabled";
    var on = state.options[enabledKey] !== false;
    var c = el("div", { class: "card" + (on ? "" : " off"), id: "card_" + svc.id });

    var logo = el("div", { class: "logo" });
    var img = el("img", { src: ICON + svc.icon + ".svg", alt: svc.name, loading: "lazy" });
    img.onerror = function () { logo.textContent = svc.emoji; };
    logo.appendChild(img);

    var status = el("span", { class: "pill", id: "st_" + svc.id, text: "" });
    var title = el("div", { class: "title" }, [el("b", { text: svc.name }), el("small", { text: DE ? svc.de : svc.en })]);

    var sw = el("label", { class: "switch", title: t("Ein/Aus", "On/Off") });
    var cb = el("input", { type: "checkbox" });
    cb.checked = on;
    cb.onchange = function () { state.edited[enabledKey] = cb.checked; c.classList.toggle("off", !cb.checked); refreshStatus(svc); };
    sw.appendChild(cb); sw.appendChild(el("span", { class: "slider" }));

    c.appendChild(el("div", { class: "head" }, [logo, title, status, sw]));

    var body = el("div", { class: "body" });
    svc.fields.forEach(function (f) { body.appendChild(field(f, svc.id)); });
    var res = el("span", { class: "hint", id: "tr_" + svc.id });
    var btn = el("button", { class: "ghost", text: t("Verbindung testen", "Test connection") });
    btn.onclick = function () { testService(svc, btn, res); };
    body.appendChild(el("div", { class: "test" }, [btn, res]));
    c.appendChild(body);
    return c;
  }

  function isConfigured(svc) {
    if (svc.id === "ha") return true;
    var urlK = svc.id + "_url", keyK = svc.id + "_api_key";
    var url = state.edited[urlK] !== undefined ? state.edited[urlK] : state.options[urlK];
    var key = state.edited[keyK] ? true : state.secretSet[keyK];
    return !!(url && key);
  }
  function refreshStatus(svc) {
    var pill = $("st_" + svc.id); if (!pill) return;
    var enabledKey = svc.id + "_enabled";
    var on = state.edited[enabledKey] !== undefined ? state.edited[enabledKey] : state.options[enabledKey] !== false;
    if (!on) { pill.className = "pill"; pill.textContent = t("aus", "off"); return; }
    if (isConfigured(svc)) { pill.className = "pill ok"; pill.textContent = svc.id === "ha" ? t("automatisch", "automatic") : t("bereit", "ready"); }
    else { pill.className = "pill warn"; pill.textContent = t("nicht eingerichtet", "not set up"); }
  }

  function testService(svc, btn, out) {
    btn.disabled = true; out.textContent = t("Teste …", "Testing …"); out.style.color = "var(--muted)";
    fetch(BASE + "api/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: svc.id, values: currentValues(svc) }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { out.textContent = (r.ok ? "✔ " : "✖ ") + r.message; out.style.color = r.ok ? "var(--ok)" : "var(--bad)"; })
      .catch(function (e) { out.textContent = "✖ " + e; out.style.color = "var(--bad)"; })
      .then(function () { btn.disabled = false; });
  }

  function renderGeneral() {
    var g = $("general"); g.textContent = "";
    g.appendChild(el("div", { class: "head" }, [el("div", { class: "logo", text: "🔐" }), el("div", { class: "title" }, [el("b", { text: t("Allgemein & Sicherheit", "General & security") }), el("small", { text: t("Gilt für alle Dienste", "Applies to all services") })])]));
    var body = el("div", { class: "body" });
    body.appendChild(el("label", { for: "f_mcp_http_token", text: t("Passwort für den MCP-Zugang (Token)", "Password for MCP access (token)") }));
    var inp = el("input", { type: "password", id: "f_mcp_http_token", autocomplete: "off" });
    inp.placeholder = state.secretSet.mcp_http_token ? t("•••••• gespeichert – leer lassen zum Behalten", "•••••• saved – leave empty to keep") : t("Noch keins – Zufallspasswort erzeugen", "None yet – generate a random one");
    inp.oninput = function () { state.edited.mcp_http_token = inp.value; };
    var gen = el("button", { class: "ghost", text: t("Erzeugen", "Generate") });
    gen.onclick = function () {
      var a = new Uint8Array(24); crypto.getRandomValues(a);
      var v = Array.prototype.map.call(a, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      inp.type = "text"; inp.value = v; state.edited.mcp_http_token = v;
      setMsg(t("Neues Token erzeugt – bitte kopieren und mit Speichern übernehmen.", "New token generated – copy it, then save."));
    };
    body.appendChild(el("div", { class: "row" }, [inp, gen]));
    body.appendChild(el("div", { class: "hint", text: t("Dieses Passwort trägst du später bei Claude ein (Header: Authorization: Bearer …). Ohne Token kann jeder im Netzwerk zugreifen!", "You enter this password in Claude later (header: Authorization: Bearer …). Without a token, anyone on your network has access!") }));
    var cb = el("input", { type: "checkbox", id: "f_read_only" }); cb.checked = !!state.options.read_only;
    cb.onchange = function () { state.edited.read_only = cb.checked; };
    body.appendChild(el("div", { class: "check" }, [cb, el("div", {}, [el("b", { text: t("Nur-Lesen-Modus", "Read-only mode") }), el("div", { class: "hint", text: t("Aus = Claude darf alles ändern (volle Schreibrechte). An = Claude darf nur ansehen.", "Off = Claude may change everything (full write access). On = Claude may only look.") })])]));
    g.appendChild(body);
  }

  function renderPaths() {
    var p = $("paths"); p.textContent = "";
    p.appendChild(el("div", { class: "head" }, [el("div", { class: "logo", text: "🔌" }), el("div", { class: "title" }, [el("b", { text: t("Adressen für Claude", "Addresses for Claude") }), el("small", { text: t("Claude.ai erlaubt ca. 100 Tools pro Connector – lege pro Programm einen Connector an.", "Claude.ai allows about 100 tools per connector – create one connector per app.") })])]));
    var tb = el("table");
    PATHS.forEach(function (r) { tb.appendChild(el("tr", {}, [el("td", {}, [el("code", { text: "https://" + t("deine-domain/DEIN-PASSWORT", "your-domain/YOUR-PASSWORD") + r[0] })]), el("td", { text: r[1] })])); });
    p.appendChild(el("div", { class: "body" }, [tb]));
  }

  function render() {
    $("ver").textContent = "v" + state.version;
    $("sub").textContent = t("Hier schaltest du ein, welche Programme Claude steuern darf. Änderungen werden mit „Speichern“ übernommen.", "Choose which programs Claude may control. Changes are applied with “Save”.");
    $("save").textContent = t("Speichern & neu starten", "Save & restart");
    renderGeneral();
    var box = $("services"); box.textContent = "";
    SERVICES.forEach(function (s) { box.appendChild(card(s)); refreshStatus(s); });
    renderPaths();
    // Status live aktualisieren, wenn URL/Key getippt wird
    document.addEventListener("input", function () { SERVICES.forEach(refreshStatus); });
  }

  $("save").onclick = function () {
    var b = $("save"); b.disabled = true; setMsg(t("Speichere …", "Saving …"));
    fetch(BASE + "api/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options: state.edited, restart: true }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r.ok) { setMsg(t("Gespeichert. Das Add-on startet neu (ca. 10 Sekunden) …", "Saved. The add-on is restarting (about 10 seconds) …"), "ok"); state.edited = {}; setTimeout(load, 12000); }
        else setMsg("✖ " + r.message, "bad");
      })
      .catch(function () { setMsg(t("Neustart läuft … Seite gleich neu laden.", "Restarting … reload shortly."), "ok"); setTimeout(load, 12000); })
      .then(function () { b.disabled = false; });
  };

  function load() {
    fetch(BASE + "api/options").then(function (r) { return r.json(); }).then(function (r) {
      state.options = r.options; state.secretSet = r.secretSet; state.version = r.version; state.edited = {};
      render();
    }).catch(function () { setMsg(t("Konnte Einstellungen nicht laden.", "Could not load settings."), "bad"); });
  }
  load();
})();
</script>
</body>
</html>`;
