# Imagen del frontend para el entorno local con Docker. Se construye desde la raíz:
#   docker build -f apps/web/Dockerfile .
# En producción el frontend lo sirve Vercel, no esta imagen.

FROM node:22-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @devpilot/web --workspace @devpilot/shared --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @devpilot/web

FROM nginx:1.28-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
