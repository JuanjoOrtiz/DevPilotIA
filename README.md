# DevPilot AI

DevPilot AI convierte una tarea o un bug descrito en lenguaje natural en una especificación técnica lista para implementar.

> En construcción: de momento están el esqueleto del proyecto y la autenticación. La documentación completa llegará con la entrega.

## Puesta en marcha

Con Docker, todo en un comando:

```bash
docker compose up --build
```

Abre <http://localhost:8080> y crea una cuenta. Tras entrar verás tus proyectos: crea el primero para darle contexto a la IA.

Para desarrollar sin Docker hace falta Node 22 y un PostgreSQL, que puede ser el del propio Compose:

```bash
cp .env.example .env
npm install
docker compose up -d db
npm run db:deploy
npm run dev:api   # en una terminal: http://localhost:3000
npm run dev:web   # en otra: http://localhost:5173
```

## Estructura

```
apps/web          Frontend: React, Vite y Atomic Design
apps/api          API: Express y Clean Architecture, con Prisma
packages/shared   Esquemas Zod y tipos compartidos
docs              Requisitos, arquitectura, contrato de IA, modelo de amenazas y despliegue
```

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration   # necesita el PostgreSQL en marcha y las migraciones aplicadas
npm run build
```

## Documentación

- [Requisitos](docs/requirements.md)
- [Arquitectura](docs/architecture.md)
- [Contrato de IA](docs/ai-contract.md)
- [Modelo de amenazas](docs/threat-model.md)
- [Despliegue](docs/deployment.md)

## Licencia

[MIT](LICENSE)
