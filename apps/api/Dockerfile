# Imagen de la API. Se construye desde la raíz del repositorio:
#   docker build -f apps/api/Dockerfile .

# ---- build: instala todo, genera el cliente de Prisma y compila -------------------
FROM node:22-slim AS build
WORKDIR /repo

# La CLI de Prisma necesita OpenSSL para su motor de migraciones.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @devpilot/api --workspace @devpilot/shared --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @devpilot/shared && npm run build -w @devpilot/api

# ---- runtime: solo dependencias de producción y el código compilado ---------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# --omit=optional deja fuera la CLI de Prisma: la imagen que sirve la API no puede
# ejecutar migraciones. Las aplica el servicio `migrate` de docker-compose.yml o el pipeline.
RUN npm ci --omit=dev --omit=optional --workspace @devpilot/api && npm cache clean --force

COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/dist apps/api/dist

USER node
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
