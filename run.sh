#!/usr/bin/with-contenv sh
# TheBoringMCP v2 – Home Assistant Add-on Entrypoint
# with-contenv (s6-overlay) reicht das Supervisor-Environment (SUPERVISOR_TOKEN) durch.
# Liest /data/options.json und startet den MCP-Server (HTTP-Transport) samt Einstellungsseite.
set -e

CONFIG_PATH=/data/options.json

get_option() {
  node -e "
    const fs = require('fs');
    const opts = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
    const value = opts['$1'];
    process.stdout.write(value === undefined || value === null ? '' : String(value));
  "
}

export MCP_HTTP_TOKEN="$(get_option mcp_http_token)"
export READ_ONLY="$(get_option read_only)"

# --- Home Assistant: ohne eigene URL/Token automatisch über den Supervisor ---
export HA_ENABLED="$(get_option ha_enabled)"
HA_URL_OPT="$(get_option ha_url)"
HA_TOKEN_OPT="$(get_option ha_token)"
if [ -n "$HA_URL_OPT" ] && [ -n "$HA_TOKEN_OPT" ]; then
  export HA_URL="$HA_URL_OPT"
  export HA_TOKEN="$HA_TOKEN_OPT"
elif [ -n "$SUPERVISOR_TOKEN" ]; then
  export HA_URL="http://supervisor/core"
  export HA_TOKEN="$SUPERVISOR_TOKEN"
fi


# --- portainer ---
export PORTAINER_ENABLED="$(get_option portainer_enabled)"
export PORTAINER_URL="$(get_option portainer_url)"
export PORTAINER_API_KEY="$(get_option portainer_api_key)"
export PORTAINER_INSECURE_TLS="$(get_option portainer_insecure_tls)"

# --- jellyfin ---
export JELLYFIN_ENABLED="$(get_option jellyfin_enabled)"
export JELLYFIN_URL="$(get_option jellyfin_url)"
export JELLYFIN_API_KEY="$(get_option jellyfin_api_key)"

# --- sonarr ---
export SONARR_ENABLED="$(get_option sonarr_enabled)"
export SONARR_URL="$(get_option sonarr_url)"
export SONARR_API_KEY="$(get_option sonarr_api_key)"

# --- radarr ---
export RADARR_ENABLED="$(get_option radarr_enabled)"
export RADARR_URL="$(get_option radarr_url)"
export RADARR_API_KEY="$(get_option radarr_api_key)"

# --- sabnzbd ---
export SABNZBD_ENABLED="$(get_option sabnzbd_enabled)"
export SABNZBD_URL="$(get_option sabnzbd_url)"
export SABNZBD_API_KEY="$(get_option sabnzbd_api_key)"

# --- unifi ---
export UNIFI_ENABLED="$(get_option unifi_enabled)"
export UNIFI_URL="$(get_option unifi_url)"
export UNIFI_API_KEY="$(get_option unifi_api_key)"
export UNIFI_INSECURE_TLS="$(get_option unifi_insecure_tls)"

# --- n8n ---
export N8N_ENABLED="$(get_option n8n_enabled)"
export N8N_URL="$(get_option n8n_url)"
export N8N_API_KEY="$(get_option n8n_api_key)"

export TRANSPORT=http
export PORT=17820
export ADMIN_UI=true
export ADMIN_UI_PORT=8099

# Kurzstatus beim Start (keine Geheimnisse)
state() { # $1 = enabled, $2 = url
  if [ "$1" = "false" ]; then echo "aus"; elif [ -n "$2" ]; then echo "an"; else echo "nicht eingerichtet"; fi
}
echo "[TheBoringMCP add-on] HA=$(state "$HA_ENABLED" "$HA_URL") Sonarr=$(state "$SONARR_ENABLED" "$SONARR_URL") Radarr=$(state "$RADARR_ENABLED" "$RADARR_URL") SABnzbd=$(state "$SABNZBD_ENABLED" "$SABNZBD_URL") Jellyfin=$(state "$JELLYFIN_ENABLED" "$JELLYFIN_URL") Portainer=$(state "$PORTAINER_ENABLED" "$PORTAINER_URL") UniFi=$(state "$UNIFI_ENABLED" "$UNIFI_URL") n8n=$(state "$N8N_ENABLED" "$N8N_URL")"
echo "[TheBoringMCP add-on] Starte MCP-Server auf Port ${PORT} ..."
exec node /app/dist/index.js
