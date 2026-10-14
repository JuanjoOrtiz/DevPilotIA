// Especificación OpenAPI de la API (RNF-17). Se genera desde los esquemas Zod de
// packages/shared: nunca se escribe a mano. Cada ruta de app.ts tiene aquí su operación,
// y un test comprueba que no falta ninguna.
import {
  answerClarificationRequestSchema,
  apiErrorSchema,
  createGenerationRequestSchema,
  createProjectRequestSchema,
  currentUserResponseSchema,
  dashboardQuerySchema,
  dashboardResponseSchema,
  exportGenerationQuerySchema,
  generationPageResponseSchema,
  generationResponseSchema,
  healthResponseSchema,
  loginRequestSchema,
  pageQuerySchema,
  projectListResponseSchema,
  projectResponseSchema,
  regenerateRequestSchema,
  registerRequestSchema,
  sessionResponseSchema,
  specificationSchema,
  translationQuerySchema,
  translationResponseSchema,
  updateProjectRequestSchema,
  updateSpecificationRequestSchema,
} from '@devpilot/shared';
import { z } from 'zod';

type JsonSchema = Record<string, unknown>;
type Method = 'get' | 'post' | 'patch' | 'delete';

interface ResponseSpec {
  status: number;
  description: string;
  /** El cuerpo en JSON. Para otros formatos, `content`. */
  schema?: z.ZodType;
  /** El cuerpo por tipo de contenido, cuando no es solo JSON. */
  content?: Record<string, z.ZodType>;
}

export interface OperationSpec {
  method: Method;
  /** Ruta con la sintaxis de Express, como en app.ts: `/projects/:id`. */
  path: string;
  tag: 'Health' | 'Auth' | 'Projects' | 'Generations' | 'Dashboard';
  summary: string;
  /** Pública: no pide access token (PUBLIC_ROUTES). */
  public?: boolean;
  /** La operación lee o renueva la cookie de refresh. */
  refreshCookie?: boolean;
  body?: z.ZodType;
  query?: z.ZodObject;
  response: ResponseSpec;
  /** Códigos de error posibles, además de 401 en las rutas protegidas y 500 en todas. */
  errors?: number[];
}

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Validation error (`VALIDATION_ERROR`), with the reason of each field in `details.fields`',
  401: 'Missing, expired or invalid access token (`UNAUTHORIZED`) or wrong credentials',
  404: 'The resource does not exist or belongs to another user (`NOT_FOUND`)',
  409: 'The resource is not in the state the operation needs',
  413: 'Request body larger than 100 kB',
  422: 'The model blocked the content (`LLM_CONTENT_BLOCKED`)',
  429: 'Daily usage limit reached or the model is rate limited; `details` says when it resets',
  500: 'Unexpected server error (`INTERNAL_ERROR`)',
  502: 'The model returned an unusable answer (`LLM_INVALID_RESPONSE`)',
  503: 'The model or the database is not available',
  504: 'The model took too long (`LLM_TIMEOUT`)',
};

/** Las operaciones de la API, en el orden de app.ts. */
export const OPERATIONS: readonly OperationSpec[] = [
  {
    method: 'get',
    path: '/health',
    tag: 'Health',
    summary: 'Liveness of the API and the database',
    public: true,
    response: { status: 200, description: 'The API is up', schema: healthResponseSchema },
    errors: [503],
  },
  {
    method: 'post',
    path: '/auth/register',
    tag: 'Auth',
    summary: 'Create an account and start a session',
    public: true,
    refreshCookie: true,
    body: registerRequestSchema,
    response: { status: 201, description: 'Session started', schema: sessionResponseSchema },
    errors: [400, 409],
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Start a session',
    public: true,
    refreshCookie: true,
    body: loginRequestSchema,
    response: { status: 200, description: 'Session started', schema: sessionResponseSchema },
    errors: [400, 401],
  },
  {
    method: 'post',
    path: '/auth/refresh',
    tag: 'Auth',
    summary: 'Exchange the refresh cookie for a new session (the cookie rotates)',
    public: true,
    refreshCookie: true,
    response: { status: 200, description: 'New session', schema: sessionResponseSchema },
    errors: [401],
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'Revoke the refresh token and clear its cookie',
    refreshCookie: true,
    response: { status: 204, description: 'Signed out' },
  },
  {
    method: 'get',
    path: '/auth/me',
    tag: 'Auth',
    summary: 'The signed-in user',
    response: { status: 200, description: 'The user', schema: currentUserResponseSchema },
  },
  {
    method: 'get',
    path: '/projects',
    tag: 'Projects',
    summary: "The user's projects, most recent activity first",
    response: { status: 200, description: 'The projects', schema: projectListResponseSchema },
  },
  {
    method: 'post',
    path: '/projects',
    tag: 'Projects',
    summary: 'Create a project',
    body: createProjectRequestSchema,
    response: { status: 201, description: 'The new project', schema: projectResponseSchema },
    errors: [400],
  },
  {
    method: 'get',
    path: '/projects/:id',
    tag: 'Projects',
    summary: 'A project',
    response: { status: 200, description: 'The project', schema: projectResponseSchema },
    errors: [404],
  },
  {
    method: 'patch',
    path: '/projects/:id',
    tag: 'Projects',
    summary: 'Edit a project',
    body: updateProjectRequestSchema,
    response: { status: 200, description: 'The edited project', schema: projectResponseSchema },
    errors: [400, 404],
  },
  {
    method: 'delete',
    path: '/projects/:id',
    tag: 'Projects',
    summary: 'Delete a project and its generations',
    response: { status: 204, description: 'Deleted' },
    errors: [404],
  },
  {
    method: 'get',
    path: '/projects/:id/generations',
    tag: 'Projects',
    summary: 'A page of the generation history, newest first',
    query: pageQuerySchema,
    response: {
      status: 200,
      description: 'One page of the history',
      schema: generationPageResponseSchema,
    },
    errors: [400, 404],
  },
  {
    method: 'post',
    path: '/projects/:id/generations',
    tag: 'Generations',
    summary: 'Start a generation; poll GET /generations/{id} until it is no longer generating',
    body: createGenerationRequestSchema,
    response: {
      status: 202,
      description: 'Generation started, in `generating`',
      schema: generationResponseSchema,
    },
    errors: [400, 404, 429],
  },
  {
    method: 'get',
    path: '/generations/:id',
    tag: 'Generations',
    summary: 'Status and current specification of a generation',
    response: { status: 200, description: 'The generation', schema: generationResponseSchema },
    errors: [404],
  },
  {
    method: 'patch',
    path: '/generations/:id',
    tag: 'Generations',
    summary: 'Save the edited specification; the AI version is kept',
    body: updateSpecificationRequestSchema,
    response: {
      status: 200,
      description: 'The edited generation',
      schema: generationResponseSchema,
    },
    errors: [400, 404, 409],
  },
  {
    method: 'delete',
    path: '/generations/:id',
    tag: 'Generations',
    summary: 'Delete a generation',
    response: { status: 204, description: 'Deleted' },
    errors: [404],
  },
  {
    method: 'post',
    path: '/generations/:id/regenerate',
    tag: 'Generations',
    summary: 'Start a new generation with the same input; the old one is kept',
    body: regenerateRequestSchema,
    response: {
      status: 202,
      description: 'New generation started',
      schema: generationResponseSchema,
    },
    errors: [400, 404, 429],
  },
  {
    method: 'post',
    path: '/generations/:id/answers',
    tag: 'Generations',
    summary: 'Answer the clarifying questions, or `skip: true` to generate without answers',
    body: answerClarificationRequestSchema,
    response: {
      status: 202,
      description: 'Generating again with the answers',
      schema: generationResponseSchema,
    },
    errors: [400, 404, 409],
  },
  {
    method: 'get',
    path: '/generations/:id/export',
    tag: 'Generations',
    summary: 'Download the current specification as Markdown or JSON',
    query: exportGenerationQuerySchema,
    response: {
      status: 200,
      description: 'The file, with its name in Content-Disposition',
      content: { 'text/markdown': z.string(), 'application/json': specificationSchema },
    },
    errors: [400, 404, 409],
  },
  {
    method: 'get',
    path: '/generations/:id/translation',
    tag: 'Generations',
    summary: 'The current specification in another language, translated once and stored',
    query: translationQuerySchema,
    response: {
      status: 200,
      description: 'The translated specification',
      schema: translationResponseSchema,
    },
    errors: [400, 404, 409, 422, 429, 502, 503, 504],
  },
  {
    method: 'get',
    path: '/dashboard/summary',
    tag: 'Dashboard',
    summary: 'Indicators and chart series of the dashboard, for a period and optionally a project',
    query: dashboardQuerySchema,
    response: { status: 200, description: 'The summary', schema: dashboardResponseSchema },
  },
];

/** JSON Schema de un esquema Zod, sin la cabecera `$schema` (OpenAPI 3.1 usa la 2020-12). */
function jsonSchema(schema: z.ZodType, io: 'input' | 'output'): JsonSchema {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { io, unrepresentable: 'any' });
  return rest;
}

/** `/projects/:id` → `/projects/{id}`. */
export function openApiPath(path: string): string {
  return path.replace(/:([A-Za-z]+)/g, '{$1}');
}

function parameters(operation: OperationSpec): JsonSchema[] {
  const pathParameters = [...operation.path.matchAll(/:([A-Za-z]+)/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    description: 'UUID of the resource; anything else answers 404',
    schema: { type: 'string', format: 'uuid' },
  }));

  const query = operation.query ? jsonSchema(operation.query, 'input') : undefined;
  const properties = (query?.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((query?.required as string[] | undefined) ?? []);
  const queryParameters = Object.entries(properties).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.has(name),
    schema,
  }));

  return [...pathParameters, ...queryParameters];
}

function responses(operation: OperationSpec): Record<string, JsonSchema> {
  const { response } = operation;
  const success: JsonSchema = { description: response.description };
  const content = response.content ?? (response.schema && { 'application/json': response.schema });
  if (content) {
    success.content = Object.fromEntries(
      Object.entries(content).map(([type, schema]) => [
        type,
        { schema: jsonSchema(schema, 'output') },
      ]),
    );
  }

  const codes = new Set(operation.errors ?? []);
  if (!operation.public) codes.add(401);
  codes.add(500);

  const errors = Object.fromEntries(
    [...codes]
      .sort((a, b) => a - b)
      .map((code) => [
        String(code),
        {
          description: ERROR_DESCRIPTIONS[code] ?? 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      ]),
  );

  return { [String(response.status)]: success, ...errors };
}

/** El documento OpenAPI 3.1 completo, para `/api/openapi.json` y Swagger UI. */
export function buildOpenApiDocument(version: string): JsonSchema {
  const paths: Record<string, Record<string, JsonSchema>> = {};

  for (const operation of OPERATIONS) {
    const path = openApiPath(operation.path);
    const definition: JsonSchema = {
      tags: [operation.tag],
      summary: operation.summary,
      operationId: `${operation.method}${path.replace(/[^A-Za-z]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : ''))}`,
      security: operation.public ? [] : [{ bearerAuth: [] }],
      parameters: parameters(operation),
      responses: responses(operation),
    };
    if (operation.body) {
      definition.requestBody = {
        required: true,
        content: { 'application/json': { schema: jsonSchema(operation.body, 'input') } },
      };
    }
    if (operation.refreshCookie) {
      definition.description =
        'Uses the httpOnly `devpilot_refresh` cookie (path `/api/v1/auth`), set and rotated by the API.';
    }
    (paths[path] ??= {})[operation.method] = definition;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'DevPilot AI API',
      version,
      description:
        'Turns a feature request or a bug report into a technical specification. Every error has the shape `{ "error": { "code", "message", "details" } }`.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Projects' },
      { name: 'Generations' },
      { name: 'Dashboard' },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from register, login or refresh. Valid for 15 minutes.',
        },
      },
      schemas: {
        ApiError: jsonSchema(apiErrorSchema, 'output'),
        Specification: jsonSchema(specificationSchema, 'output'),
      },
    },
  };
}
