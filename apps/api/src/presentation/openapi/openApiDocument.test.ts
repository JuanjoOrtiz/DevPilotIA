import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../test-support/testApp.js';
import { PUBLIC_ROUTES } from '../http/app.js';
import { buildOpenApiDocument, OPERATIONS, openApiPath } from './openApiDocument.js';

type Json = Record<string, unknown>;

/** Las rutas que monta app.ts, leídas de su código: así ninguna se queda sin documentar. */
function declaredRoutes(): string[] {
  const source = readFileSync(new URL('../http/app.ts', import.meta.url), 'utf8');
  return [...source.matchAll(/v1\.(get|post|patch|delete)\('([^']+)'/g)].map(
    ([, method, path]) => `${method} ${path}`,
  );
}

const document = buildOpenApiDocument('test');
const paths = document.paths as Record<string, Record<string, Json>>;

/** Todas las referencias `$ref` del documento. */
function refs(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(refs);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === '$ref' && typeof child === 'string' ? [child] : refs(child),
  );
}

// RNF-17
describe('OpenAPI document', () => {
  it('documents every route of the API, and nothing that does not exist', () => {
    const documented = OPERATIONS.map((operation) => `${operation.method} ${operation.path}`);

    expect(documented.toSorted()).toEqual(declaredRoutes().toSorted());
    expect(declaredRoutes()).toHaveLength(21);
  });

  it('marks as public exactly the public routes', () => {
    const publicOperations = OPERATIONS.filter((operation) => operation.public).map(
      (operation) => `${operation.method.toUpperCase()} ${operation.path}`,
    );

    expect(publicOperations.toSorted()).toEqual(
      PUBLIC_ROUTES.map((route) => `${route.method} ${route.path}`).toSorted(),
    );
  });

  it('is a valid OpenAPI 3.1 document', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(() => JSON.parse(JSON.stringify(document))).not.toThrow();

    const ids = new Set<string>();
    for (const [path, operations] of Object.entries(paths)) {
      const names = [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => name);
      for (const operation of Object.values(operations)) {
        const responses = operation.responses as Record<string, Json>;
        const parameters = operation.parameters as { name: string; in: string }[];
        expect(Object.keys(responses).some((code) => code.startsWith('2'))).toBe(true);
        expect(responses['500']).toBeDefined();
        expect(parameters.filter((p) => p.in === 'path').map((p) => p.name)).toEqual(names);
        expect(ids.has(String(operation.operationId))).toBe(false);
        ids.add(String(operation.operationId));
      }
    }

    const components = document.components as { schemas: Json };
    for (const ref of refs(document)) {
      expect(ref.startsWith('#/components/schemas/')).toBe(true);
      expect(components.schemas[ref.replace('#/components/schemas/', '')]).toBeDefined();
    }
  });

  it('asks for the bearer token everywhere except on public routes', () => {
    const projects = paths[openApiPath('/projects/:id')]?.get;
    const login = paths['/auth/login']?.post;

    expect(projects?.security).toEqual([{ bearerAuth: [] }]);
    expect(projects?.responses).toHaveProperty('401');
    expect(login?.security).toEqual([]);
  });

  it('takes the request bodies and queries from the shared Zod schemas', () => {
    const create = paths['/projects']?.post?.requestBody as Json;
    const body = (create.content as Json)['application/json'] as { schema: Json };
    const history = paths['/projects/{id}/generations']?.get?.parameters as { name: string }[];

    expect(body.schema.required).toEqual(['name']);
    expect(history.map((parameter) => parameter.name)).toEqual(['id', 'page', 'pageSize']);
  });
});

// SEG-17
describe('API docs routes', () => {
  it('answer 404 unless they are enabled', async () => {
    const { app } = createTestApp();

    expect((await request(app).get('/api/openapi.json')).status).toBe(404);
    expect((await request(app).get('/api/docs')).status).toBe(404);
  });

  it('serve the specification and Swagger UI with a strict policy when enabled', async () => {
    const { app } = createTestApp({ apiDocs: true });

    const spec = await request(app).get('/api/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body).toMatchObject({ openapi: '3.1.0', info: { title: 'DevPilot AI API' } });

    const page = await request(app).get('/api/docs');
    expect(page.status).toBe(200);
    expect(page.text).toContain('integrity="sha384-');
    expect(page.headers['content-security-policy']).toContain(
      "script-src 'self' https://cdn.jsdelivr.net",
    );
  });
});
