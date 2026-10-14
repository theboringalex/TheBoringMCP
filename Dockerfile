# syntax=docker/dockerfile:1

# Muss vor dem ersten FROM stehen, sonst kommt der --build-arg-Wert im
# zweiten Stage nicht an (Docker/BuildKit-Eigenheit bei Multi-Stage-Builds).
ARG BUILD_FROM=ghcr.io/hassio-addons/base/amd64:15.0.7

# ---- Stage 1: TypeScript-Build -------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
 && npm prune --omit=dev

# ---- Stage 2: Home-Assistant-Add-on-Image ---------------------------------
FROM ${BUILD_FROM}

# Node.js in das HA-Add-on-Base-Image (Alpine) installieren
RUN apk add --no-cache nodejs

# UniFi: unifi-network-mcp (Python >= 3.13) in eigener venv. Wird von TheBoringMCP
# als Unterprozess gestartet. Auf armv7 gibt es keine passenden Wheels -> dort
# bleibt UniFi "nicht verfügbar" (der Rest funktioniert).
ARG BUILD_ARCH
ARG UNIFI_MCP_VERSION=0.38.1
RUN if [ "${BUILD_ARCH}" = "armv7" ]; then \
      echo "armv7: UniFi-Bridge wird nicht installiert"; \
    else \
      apk add --no-cache uv || (apk add --no-cache py3-pip && pip install --no-cache-dir --break-system-packages uv); \
      UV_PYTHON_INSTALL_DIR=/opt/uv-python uv venv --python 3.13 /opt/unifi-venv \
      && uv pip install --no-cache --python /opt/unifi-venv/bin/python "unifi-network-mcp==${UNIFI_MCP_VERSION}"; \
    fi
ENV UNIFI_MCP_COMMAND=/opt/unifi-venv/bin/unifi-network-mcp

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY assets ./assets

COPY run.sh /
RUN chmod a+x /run.sh

LABEL \
  io.hass.name="TheBoringMCP" \
  io.hass.description="Ein MCP-Endpunkt für Home Assistant, Portainer, UniFi, Jellyfin, Plex und GitHub" \
  io.hass.type="addon" \
  io.hass.version="2.0.0"

CMD [ "/run.sh" ]
