import { z } from 'zod';

/** Credenciales de DATABASE_URL en .env.example y en docker-compose.yml. Nunca valen en producción. */
const EXAMPLE_DATABASE_CREDENTIALS = 'devpilot:devpilot@';

/** Modos de sslmode que cifran la conexión con la base de datos. */
const ENCRYPTED_SSL_MODE = /[?&]sslmode=(require|verify-ca|verify-full)(&|$)/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string({ error: 'is required' })
    .regex(/^postgres(ql)?:\/\/.+/, 'must be a postgresql:// connection string'),
  APP_VERSION: z.string().min(1).default('dev'),
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
 * ni si producción usa credenciales de ejemplo (SEG-16) o una conexión sin cifrar a la
 * base de datos (SEG-04).
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse({
    ...source,
    // Render publica el commit desplegado en RENDER_GIT_COMMIT.
    APP_VERSION: source.APP_VERSION ?? source.RENDER_GIT_COMMIT,
  });
  if (!parsed.success) {
    throw new InvalidEnvError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }

  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    const problems: string[] = [];
    if (env.DATABASE_URL.includes(EXAMPLE_DATABASE_CREDENTIALS)) {
      problems.push('DATABASE_URL: uses the example credentials from .env.example');
    }
    if (!ENCRYPTED_SSL_MODE.test(env.DATABASE_URL)) {
      problems.push('DATABASE_URL: must set sslmode=require or sslmode=verify-full in production');
    }
    if (problems.length > 0) throw new InvalidEnvError(problems);
  }

  return env;
}
