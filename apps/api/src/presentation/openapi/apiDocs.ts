import { Router } from 'express';
import { buildOpenApiDocument } from './openApiDocument.js';

/** Swagger UI desde jsDelivr, con versión fija y comprobación de integridad (SRI). */
const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15';
const SCRIPT_INTEGRITY = 'sha384-m7zaGj7MPzU+G4lz2eyy73GxK9bbRDr9bB2CSdj8wodg2wu/Wnt6wsoLP3JD+RS9';
const STYLE_INTEGRITY = 'sha384-fgyWYkUAamzuI8mJFu/xpRP0JWCJRwkwUwsYDoOYVHUJ8NQE5cENn8ib3ppwFFSX';

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DevPilot AI API</title>
<link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css" integrity="${STYLE_INTEGRITY}" crossorigin="anonymous">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${SWAGGER_UI}/swagger-ui-bundle.js" integrity="${SCRIPT_INTEGRITY}" crossorigin="anonymous"></script>
<script src="/api/docs/init.js"></script>
</body>
</html>`;

const INIT = `window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });`;

/** Solo esta página carga código de fuera, y solo de jsDelivr: el resto de la API sigue con la CSP de helmet. */
const DOCS_CSP = [
  "default-src 'none'",
  `script-src 'self' https://cdn.jsdelivr.net`,
  `style-src https://cdn.jsdelivr.net 'unsafe-inline'`,
  "img-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * SEG-17: la especificación y Swagger UI. app.ts solo las monta si `API_DOCS_ENABLED`
 * está activa; sin ella, las dos rutas responden 404 como cualquier otra desconocida.
 */
export function createApiDocsRouter(version: string): Router {
  const document = buildOpenApiDocument(version);
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.get('/docs', (_req, res) => {
    res.setHeader('Content-Security-Policy', DOCS_CSP).type('html').send(PAGE);
  });
  router.get('/docs/init.js', (_req, res) => {
    res.setHeader('Content-Security-Policy', DOCS_CSP).type('js').send(INIT);
  });

  return router;
}
