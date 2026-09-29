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

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

COPY run.sh /
RUN chmod a+x /run.sh

LABEL \
  io.hass.name="TheBoringMCP" \
  io.hass.description="MCP-Server mit vollem Zugriff auf Home Assistant, Portainer, Sonarr, Radarr, SABnzbd, Jellyfin, Plex und GitHub" \
  io.hass.type="addon" \
  io.hass.version="1.0.0"

CMD [ "/run.sh" ]
