import { z } from 'zod';

/** Credenciales de DATABASE_URL en .env.example y en docker-compose.yml. Nunca valen en producción. */
const EXAMPLE_DATABASE_CREDENTIALS = 'devpilot:devpilot@';

/** Los secretos de .env.example y de docker-compose.yml empiezan así. Nunca valen en producción. */
const EXAMPLE_SECRET_PREFIX = 'example-';

/** Modos de sslmode que cifran la conexión con la base de datos. */
const ENCRYPTED_SSL_MODE = /[?&]sslmode=(require|verify-ca|verify-full)(&|$)/;

/** SEG-04: secretos de 32 bytes o más. */
const MIN_SECRET_BYTES = 32;

const jwtSecret = z
  .string({ error: 'is required' })
  .refine(
    (secret) => Buffer.byteLength(secret, 'utf8') >= MIN_SECRET_BYTES,
    `must be at least ${MIN_SECRET_BYTES} bytes long`,
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string({ error: 'is required' })
    .regex(/^postgres(ql)?:\/\/.+/, 'must be a postgresql:// connection string'),
  JWT_ACCESS_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtSecret,
  APP_VERSION: z.string().min(1).default('dev'),
  /** `gemini` en producción; `fake` responde sin red ni clave (local y CI). */
  LLM_PROVIDER: z.enum(['gemini', 'fake']).default('fake'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1024).max(65536).default(8192),
  LLM_ATTEMPT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(20_000),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(45_000),
  /** Espera del modelo simulado, para ver los estados de la interfaz en local. */
  FAKE_LLM_LATENCY_MS: z.coerce.number().int().min(0).default(0),
  GENERATION_DAILY_LIMIT_PER_USER: z.coerce.number().int().min(1).default(20),
  GENERATION_DAILY_LIMIT_GLOBAL: z.coerce.number().int().min(1).default(200),
  // SEG-17: Swagger UI y /api/openapi.json solo con el valor exacto `true`.
  API_DOCS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/** La configuración no es válida. El mensaje nombra las variables, nunca sus valores. */
export class InvalidEnvError extends Error {
  constructor(problems: string[]) {
    super(`Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'InvalidEnvError';
  }
}

/**
 * Valida las variables de entorno al arrancar. La API no arranca si falta alguna (SEG-02)
 * ni si producción usa credenciales o secretos de ejemplo (SEG-16), secretos iguales o
 * cortos (SEG-04) o una conexión sin cifrar a la base de datos (SEG-04).
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse({
    ...source,
    // Vercel publica el commit desplegado en VERCEL_GIT_COMMIT_SHA.
    APP_VERSION: source.APP_VERSION ?? source.VERCEL_GIT_COMMIT_SHA,
  });
  if (!parsed.success) {
    throw new InvalidEnvError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }

  const env = parsed.data;
  const problems: string[] = [];

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push('JWT_REFRESH_SECRET: must be different from JWT_ACCESS_SECRET');
  }
  if (env.LLM_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
    problems.push('GEMINI_API_KEY: is required when LLM_PROVIDER is gemini');
  }
  if (env.NODE_ENV === 'production') {
    if (env.LLM_PROVIDER !== 'gemini') {
      problems.push('LLM_PROVIDER: must be gemini in production');
    }
    if (env.DATABASE_URL.includes(EXAMPLE_DATABASE_CREDENTIALS)) {
      problems.push('DATABASE_URL: uses the example credentials from .env.example');
    }
    if (!ENCRYPTED_SSL_MODE.test(env.DATABASE_URL)) {
      problems.push('DATABASE_URL: must set sslmode=require or sslmode=verify-full in production');
    }
    for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (env[name].startsWith(EXAMPLE_SECRET_PREFIX)) {
        problems.push(`${name}: uses the example secret from .env.example`);
      }
    }
  }
  if (problems.length > 0) throw new InvalidEnvError(problems);

  return env;
}

/**
 * Configuración del arranque en Vercel, que siempre es producción: cookies `Secure` y todas
 * las comprobaciones de arriba. No se lee de NODE_ENV porque Vercel no garantiza esa variable
 * al ejecutar la función, y fijarla en el panel rompe la compilación: con
 * `NODE_ENV=production`, `npm ci` no instala las dependencias de desarrollo que necesita.
 */
export function loadVercelEnv(source: Record<string, string | undefined> = process.env): Env {
  return loadEnv({ ...source, NODE_ENV: 'production' });
}
