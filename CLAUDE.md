# DevPilot AI — guía para Claude Code

DevPilot AI convierte una tarea o un bug descrito en lenguaje natural en una especificación técnica lista para implementar. Es un TFM de máster: lo construye una sola persona y se entrega el **20 de octubre de 2026**.

Este fichero resume las reglas que no se negocian. El detalle está en `docs/`; léelo antes de tocar el área correspondiente.

| Documento | Para qué |
| --- | --- |
| `docs/requirements.md` | Requisitos con ID (RF, RNF, SEG), prioridades, pipeline y plan por días |
| `docs/architecture.md` | Stack, estructura del monorepo, capas, modelo de datos y API REST |
| `docs/ai-contract.md` | Esquema de la especificación, flujo de una generación y códigos de error |
| `docs/threat-model.md` | Activos, actores, amenazas y mitigaciones |
| `docs/deployment.md` | Puesta en marcha en Supabase y Vercel |

## Stack

- **Monorepo** con npm workspaces: `apps/web`, `apps/api`, `packages/shared`. Node 22, TypeScript 6 en modo estricto, ESLint y Prettier.
- **Frontend**: React + TypeScript + Vite, Atomic Design, TanStack Query, React Hook Form + Zod, Recharts, react-i18next.
- **Backend**: Node.js + TypeScript + Express, Clean Architecture, Prisma + PostgreSQL.
- **LLM**: Gemini API (capa gratuita, modelo Flash) detrás de la interfaz `LLMProvider`.
- **Pruebas**: Vitest, Supertest, React Testing Library.
- **Despliegue**: Vercel (web y API, en dos proyectos) y Supabase (PostgreSQL). Docker para el entorno local y el CI. Sin AWS y a coste cero.

No añadas dependencias fuera de este stack sin preguntar antes.

## Scripts

Desde la raíz del repositorio:

```
npm run lint              # ESLint (incluye las reglas de capas y niveles) y Prettier
npm run typecheck         # tipos en todos los workspaces
npm test                  # tests sin base de datos; la API mide cobertura
npm run test:integration  # tests de la API contra PostgreSQL (DATABASE_URL y migraciones aplicadas)
npm run build             # shared, API y web
npm run dev:api           # API en http://localhost:3000, con recarga
npm run dev:web           # frontend en http://localhost:5173, reenvía /api a la API
npm run db:migrate        # crea y aplica una migración en desarrollo
npm run db:deploy         # aplica las migraciones pendientes
docker compose up --build # todo en local: http://localhost:8080
```

Antes de dar un cambio por terminado, `lint`, `typecheck` y `test` pasan en local.

## Reglas del backend (Clean Architecture)

Capas en `apps/api/src`: `domain`, `application`, `infrastructure`, `presentation`. Las dependencias apuntan siempre hacia `domain`.

- `domain` no importa Express, Prisma ni el SDK del LLM. Contiene entidades, errores de dominio e interfaces (repositorios y `LLMProvider`).
- `application` solo depende de `domain`. Un caso de uso por fichero, con sus dependencias inyectadas por constructor.
- `infrastructure` implementa las interfaces: Prisma en `database/`, `GeminiProvider` y `FakeLLMProvider` en `ai/`. Traduce los errores del proveedor a errores de dominio.
- `presentation` contiene rutas, controladores, validadores y la generación de OpenAPI. Un controlador valida, llama a un caso de uso y da forma a la respuesta; no contiene lógica de negocio.
- Los imports relativos llevan extensión `.js` (ESM de Node): `import { x } from './x.js'`.
- El cliente de Prisma se genera en `src/infrastructure/database/generated/` y no se versiona; solo lo importa `infrastructure`.
- La imagen que sirve la API no lleva la CLI de Prisma: las migraciones las aplica el servicio `migrate` de Docker Compose o el pipeline.
- Toda entrada se valida con Zod antes de llegar a un caso de uso. Los esquemas compartidos viven en `packages/shared`, que solo contiene esquemas Zod y tipos y se puede importar desde cualquier capa.
- La composición se hace solo en `apps/api/src/composition.ts`, el único fichero que importa de todas las capas. Hay dos arranques: `main.ts` como servidor (desarrollo y Docker) e `index.ts` como función (Vercel).
- En producción la API es una función de Vercel: no guardes estado en memoria entre peticiones (límites, contadores, cachés) y registra con `waitUntil` cualquier trabajo que siga después de responder.
- Todos los errores salen con el formato `{ "error": { "code", "message", "details" } }`.

## Reglas del frontend (Atomic Design)

Componentes en `apps/web/src/components`: `atoms`, `molecules`, `organisms`, `templates`, `pages`. Un nivel solo importa niveles inferiores.

- Átomos y moléculas son presentacionales: sin llamadas a la API, sin estado global, sin TanStack Query.
- El acceso a datos vive en `features/`, `services/` y `hooks/`. Las páginas componen plantillas y organismos y conectan los datos.
- Cada componente vive en su carpeta, con su CSS Module y su test. Los estilos usan las variables de `src/styles/tokens.css`, nunca colores escritos a mano.
- Las llamadas a la API pasan por `services/apiClient.ts`, con rutas relativas bajo `/api/v1`.
- Ningún texto visible va escrito dentro de un componente: todo sale de los ficheros de traducción (`es` primero; `en` es de nivel «importante»).
- Cada vista con datos tiene estados de carga, vacío y error. La interfaz funciona desde 360 px de ancho.
- Los mensajes de error se traducen en el frontend a partir del `code` que devuelve la API.
- Prohibido `dangerouslySetInnerHTML`: el texto del usuario y la salida del LLM se muestran siempre como texto.

## Reglas de seguridad por defecto

- **Denegar por defecto**: la autenticación es global y las rutas públicas son una lista explícita. Una ruta nueva nace protegida.
- **Aislamiento por usuario**: toda consulta de proyectos y generaciones filtra por el usuario en sesión. Un recurso ajeno responde 404, nunca 403.
- **Secretos**: solo en variables de entorno del servidor. Nada de claves en el repositorio, en el frontend ni en los logs. `.env.example` lleva todas las variables sin valores reales.
- **Arranque seguro**: la API no arranca si falta una variable o si, en producción, detecta valores de ejemplo o secretos débiles.
- **Mismo origen**: el navegador siempre habla con un solo origen, que reenvía `/api` a la API (Vite en desarrollo, nginx en Docker, Vercel en producción). La API no envía cabeceras CORS y marca sus respuestas con `Cache-Control: no-store`.
- **Base de datos cifrada**: en producción la API no arranca si `DATABASE_URL` no fija `sslmode=require` o `sslmode=verify-full`.
- **Swagger UI** viene desactivada y se activa con una variable de entorno.
- **Sin cuenta demo**: el acceso es por registro. Cada cuenta nueva recibe un proyecto de ejemplo creado desde un fichero del repositorio, sin llamar al LLM.
- **Seed**: en local crea un usuario de ejemplo; en producción nunca crea usuarios, solo carga datos en una cuenta existente.
- **Access token** solo en memoria en el navegador, nunca en `localStorage`; el refresh token va en cookie httpOnly.
- Cada requisito SEG tiene su test. Si implementas uno, escribe el test indicado en `docs/requirements.md`.

## Reglas del LLM

- Los casos de uso dependen de `LLMProvider`, nunca de `GeminiProvider`.
- Los tests y el CI usan siempre `FakeLLMProvider`. Ningún test llama a Gemini y la clave no se guarda en GitHub.
- La respuesta del modelo no es fiable: se valida con el esquema Zod antes de guardarse.
- Una generación termina o falla en 45 s en total, con 20 s por intento.
- El texto del usuario va en el prompt delimitado como dato; las instrucciones del sistema son fijas. El prompt nunca contiene secretos ni datos de otros usuarios.

## TypeScript y pruebas

- Modo estricto en todo el monorepo, sin `any` explícitos.
- Los tests van junto al código: `*.test.ts` no necesita base de datos; `*.int.test.ts` se ejecuta contra PostgreSQL.
- Cada bloque llega con sus tests: unitarios de todos los casos de uso con repositorios en memoria y `FakeLLMProvider`; de integración para los endpoints de autenticación y generación.
- Cobertura mínima del 70 % en `domain` y `application`.

## Git

- Conventional Commits, en inglés (`feat(api): add register use case`).
- Dos ramas permanentes y protegidas: `develop` integra el trabajo y `main` es lo que está en producción. Ninguna admite push directo.
- El trabajo sale de `develop` en ramas `feature/…`, `fix/…` o `chore/…` y vuelve a `develop` por pull request con el CI en verde.
- Al cerrar un bloque, `develop` pasa a `main` con un pull request fusionado con merge commit, nunca con squash. Ese merge es el despliegue.
- Nunca subas `.env`, claves ni volcados de base de datos.
- Código, identificadores y commits en inglés; documentación de `docs/` en español.

## Prioridades y alcance

Los requisitos tienen tres niveles: imprescindible, importante y prescindible (tabla en `docs/requirements.md`).

- **Orden estricto**: no empieces nada «importante» hasta que lo «imprescindible» esté desplegado y probado.
- No amplíes el alcance por iniciativa propia. Si una tarea pide algo que no está en los requisitos, avisa antes de implementarlo.
- Cada día termina con su bloque desplegado, no solo funcionando en local.

## Plan por días (octubre de 2026)

| Día | Bloque |
| --- | --- |
| 10 | Base: repo, Docker, CI y despliegue. Modelo de amenazas |
| 11 | Autenticación y átomos base |
| 12 | Proyectos e historial |
| 13–14 | Generación con IA y errores |
| 15 | Dashboard, exportación y datos de ejemplo (seed). **Imprescindible desplegado** |
| 16 | Proyecto de ejemplo, edición, regenerar y exportación |
| 17 | Inglés, OpenAPI, Storybook y Sentry |
| 18 | README, seguridad y cierre del código |
| 19 | Slides y vídeo |
| 20 | **Entrega** |
