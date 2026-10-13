import { describe, expect, it } from 'vitest';
import { TEST_SECRETS } from '../../test-support/testEnv.js';
import { InvalidEnvError, loadEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://app:s3cret-value@db.internal:5432/devpilot',
  ...TEST_SECRETS,
};

describe('loadEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = loadEnv(valid);

    expect(env).toEqual({
      ...valid,
      NODE_ENV: 'development',
      PORT: 3000,
      APP_VERSION: 'dev',
      LLM_PROVIDER: 'fake',
      GEMINI_MODEL: 'gemini-flash-latest',
      LLM_MAX_OUTPUT_TOKENS: 8192,
      LLM_ATTEMPT_TIMEOUT_MS: 20_000,
      GENERATION_TIMEOUT_MS: 45_000,
      FAKE_LLM_LATENCY_MS: 0,
      GENERATION_DAILY_LIMIT_PER_USER: 20,
      GENERATION_DAILY_LIMIT_GLOBAL: 200,
    });
  });

  it('takes the version from the deployed commit when APP_VERSION is not set', () => {
    expect(loadEnv({ ...valid, VERCEL_GIT_COMMIT_SHA: 'abc123' }).APP_VERSION).toBe('abc123');
    expect(
      loadEnv({ ...valid, VERCEL_GIT_COMMIT_SHA: 'abc123', APP_VERSION: 'v1' }).APP_VERSION,
    ).toBe('v1');
  });

  it('refuses to start without DATABASE_URL', () => {
    expect(() => loadEnv(TEST_SECRETS)).toThrow(InvalidEnvError);
    expect(() => loadEnv(TEST_SECRETS)).toThrow(/DATABASE_URL/);
  });

  it('refuses a DATABASE_URL that is not a PostgreSQL connection string', () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: 'mysql://app:pw@db/devpilot' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('refuses an invalid PORT', () => {
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('never prints the value of a variable', () => {
    const attempt = () => loadEnv({ ...valid, PORT: '99999999', JWT_ACCESS_SECRET: 'short-one' });

    expect(attempt).toThrow(InvalidEnvError);
    expect(attempt).not.toThrow(/s3cret-value/);
    expect(attempt).not.toThrow(/short-one/);
  });
});

// SEG-04: secretos de 32 bytes o más y distintos para access y refresh.
describe('loadEnv with JWT secrets', () => {
  it('refuses to start without them', () => {
    const attempt = () => loadEnv({ DATABASE_URL: valid.DATABASE_URL });

    expect(attempt).toThrow(/JWT_ACCESS_SECRET: is required/);
    expect(attempt).toThrow(/JWT_REFRESH_SECRET: is required/);
  });

  it('refuses a secret shorter than 32 bytes', () => {
    expect(() => loadEnv({ ...valid, JWT_ACCESS_SECRET: 'x'.repeat(31) })).toThrow(
      /JWT_ACCESS_SECRET: must be at least 32 bytes/,
    );
    expect(loadEnv({ ...valid, JWT_ACCESS_SECRET: 'x'.repeat(32) }).JWT_ACCESS_SECRET).toHaveLength(
      32,
    );
  });

  it('refuses the same secret for access and refresh tokens', () => {
    expect(() => loadEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(
      /JWT_REFRESH_SECRET: must be different/,
    );
  });
});

describe('loadEnv in production', () => {
  const production = {
    ...valid,
    NODE_ENV: 'production',
    DATABASE_URL: `${valid.DATABASE_URL}?sslmode=require&uselibpqcompat=true`,
    LLM_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-gemini-key',
  };

  it('accepts an encrypted connection with real credentials and secrets', () => {
    expect(loadEnv(production).NODE_ENV).toBe('production');
    expect(
      loadEnv({ ...production, DATABASE_URL: `${valid.DATABASE_URL}?sslmode=verify-full` })
        .NODE_ENV,
    ).toBe('production');
  });

  // SEG-16: sin secretos por defecto.
  it('refuses the example database credentials', () => {
    const example = 'postgresql://devpilot:devpilot@db:5432/devpilot?sslmode=require';

    expect(() => loadEnv({ ...production, DATABASE_URL: example })).toThrow(/example credentials/);
    expect(loadEnv({ ...valid, DATABASE_URL: example, NODE_ENV: 'development' }).NODE_ENV).toBe(
      'development',
    );
  });

  // SEG-16: los secretos de .env.example y de Docker Compose no arrancan en producción.
  it('refuses the example JWT secrets', () => {
    const example = {
      JWT_ACCESS_SECRET: 'example-access-secret-change-me-0123456789',
      JWT_REFRESH_SECRET: 'example-refresh-secret-change-me-012345678',
    };

    expect(() => loadEnv({ ...production, ...example })).toThrow(
      /JWT_ACCESS_SECRET: uses the example secret/,
    );
    expect(() => loadEnv({ ...production, ...example })).toThrow(
      /JWT_REFRESH_SECRET: uses the example secret/,
    );
    expect(loadEnv({ ...valid, ...example }).NODE_ENV).toBe('development');
  });

  // SEG-04: TLS en la conexión a la base de datos.
  it('refuses a database connection that is not encrypted', () => {
    expect(() => loadEnv({ ...production, DATABASE_URL: valid.DATABASE_URL })).toThrow(/sslmode/);
    expect(() =>
      loadEnv({ ...production, DATABASE_URL: `${valid.DATABASE_URL}?sslmode=disable` }),
    ).toThrow(/sslmode/);
  });
});

describe('loadEnv for the language model', () => {
  it('needs a key to use Gemini', () => {
    expect(() => loadEnv({ ...valid, LLM_PROVIDER: 'gemini' })).toThrow(/GEMINI_API_KEY/);
    expect(loadEnv({ ...valid, LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' }).LLM_PROVIDER).toBe(
      'gemini',
    );
  });

  // Producción nunca responde con el modelo simulado.
  it('refuses the fake model in production', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      DATABASE_URL: `${valid.DATABASE_URL}?sslmode=require`,
    };

    expect(() => loadEnv(production)).toThrow(/LLM_PROVIDER: must be gemini/);
  });
});
