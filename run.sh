#!/usr/bin/with-contenv sh
# TheBoringMCP – Home Assistant Add-on Entrypoint
# with-contenv (s6-overlay): reicht das vom Supervisor gesetzte
# Container-Environment (u.a. SUPERVISOR_TOKEN) an dieses Skript durch -
# ohne das kommt unter dem hassio-addons-Base-Image (s6-overlay) davon
# nichts an, nur PATH/PWD/SHLVL.
# Liest /data/options.json (HA-Add-on-Optionen) und startet den MCP-Server
# im HTTP(Streamable)-Transportmodus, damit Claude ihn per URL erreichen kann.
set -e

CONFIG_PATH=/data/options.json

get_option() {
  # Gibt "" zurück, wenn der Wert fehlt/leer ist statt "null"
  node -e "
    const fs = require('fs');
    const opts = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
    const value = opts['$1'];
    process.stdout.write(value === undefined || value === null ? '' : String(value));
  "
}

export MCP_HTTP_TOKEN="$(get_option mcp_http_token)"
export READ_ONLY="$(get_option read_only)"

# Zugriffsschalter je App (Standard: an). "false" = die App bekommt KEINEN Zugriff.
export ENABLE_HOMEASSISTANT="$(get_option enable_homeassistant)"
export ENABLE_PORTAINER="$(get_option enable_portainer)"
export ENABLE_UNIFI="$(get_option enable_unifi)"
export ENABLE_JELLYFIN="$(get_option enable_jellyfin)"
export ENABLE_PLEX="$(get_option enable_plex)"
export ENABLE_GITHUB="$(get_option enable_github)"

HA_URL_OPT="$(get_option ha_url)"
HA_TOKEN_OPT="$(get_option ha_token)"
if [ -n "$HA_URL_OPT" ] && [ -n "$HA_TOKEN_OPT" ]; then
  export HA_URL="$HA_URL_OPT"
  export HA_TOKEN="$HA_TOKEN_OPT"
elif [ -n "$SUPERVISOR_TOKEN" ]; then
  # Läuft als Add-on mit homeassistant_api: true -> Supervisor-Proxy nutzen,
  # kein eigenes Long-Lived-Token nötig.
  export HA_URL="http://supervisor/core"
  export HA_TOKEN="$SUPERVISOR_TOKEN"
fi

export PORTAINER_URL="$(get_option portainer_url)"
export PORTAINER_API_KEY="$(get_option portainer_api_key)"
PORTAINER_INSECURE_TLS_OPT="$(get_option portainer_insecure_tls)"
export PORTAINER_INSECURE_TLS="${PORTAINER_INSECURE_TLS_OPT:-true}"

export UNIFI_HOST="$(get_option unifi_host)"
export UNIFI_PORT="$(get_option unifi_port)"
export UNIFI_SITE="$(get_option unifi_site)"
export UNIFI_API_KEY="$(get_option unifi_api_key)"
export UNIFI_USERNAME="$(get_option unifi_username)"
export UNIFI_PASSWORD="$(get_option unifi_password)"
export UNIFI_VERIFY_SSL="$(get_option unifi_verify_ssl)"
export UNIFI_TOOL_MODE="$(get_option unifi_tool_mode)"
export UNIFI_ALLOW_CREATE="$(get_option unifi_allow_create)"
export UNIFI_ALLOW_UPDATE="$(get_option unifi_allow_update)"
export UNIFI_ALLOW_DELETE="$(get_option unifi_allow_delete)"
export UNIFI_PERMISSION_MODE="$(get_option unifi_permission_mode)"

export JELLYFIN_URL="$(get_option jellyfin_url)"
export JELLYFIN_API_KEY="$(get_option jellyfin_api_key)"

export GITHUB_TOKEN="$(get_option github_token)"
export GITHUB_API_URL="$(get_option github_api_url)"

export PLEX_URL="$(get_option plex_url)"
export PLEX_TOKEN="$(get_option plex_token)"

export TRANSPORT=http
export PORT=17820

# Kurzstatus beim Start (keine Secrets, nur ob ein Wert gesetzt ist)
present() { [ -n "$1" ] && echo "gesetzt" || echo "leer"; }
sw() { [ "$1" = "false" ] && echo "AUS" || echo "an"; }
echo "[TheBoringMCP add-on] Schalter: HomeAssistant=$(sw "$ENABLE_HOMEASSISTANT") Portainer=$(sw "$ENABLE_PORTAINER") UniFi=$(sw "$ENABLE_UNIFI") Jellyfin=$(sw "$ENABLE_JELLYFIN") Plex=$(sw "$ENABLE_PLEX") GitHub=$(sw "$ENABLE_GITHUB")"
echo "[TheBoringMCP add-on] Konfiguration: UNIFI_HOST=$(present "$UNIFI_HOST") HA_URL=$(present "$HA_URL") PORTAINER_URL=$(present "$PORTAINER_URL") JELLYFIN_URL=$(present "$JELLYFIN_URL") GITHUB_TOKEN=$(present "$GITHUB_TOKEN") PLEX_URL=$(present "$PLEX_URL")"

echo "[TheBoringMCP add-on] Starte MCP-Server auf Port ${PORT} ..."
exec node /app/dist/index.js
