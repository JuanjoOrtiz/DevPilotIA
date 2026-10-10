import { describe, expect, it } from 'vitest';
import { InvalidEnvError, loadEnv } from './env.js';

const valid = { DATABASE_URL: 'postgresql://app:s3cret-value@db.internal:5432/devpilot' };

describe('loadEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = loadEnv(valid);

    expect(env).toEqual({ ...valid, NODE_ENV: 'development', PORT: 3000, APP_VERSION: 'dev' });
  });

  it('takes the version from the deployed commit when APP_VERSION is not set', () => {
    expect(loadEnv({ ...valid, RENDER_GIT_COMMIT: 'abc123' }).APP_VERSION).toBe('abc123');
    expect(loadEnv({ ...valid, RENDER_GIT_COMMIT: 'abc123', APP_VERSION: 'v1' }).APP_VERSION).toBe(
      'v1',
    );
  });

  it('refuses to start without DATABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(InvalidEnvError);
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('refuses a DATABASE_URL that is not a PostgreSQL connection string', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://app:pw@db/devpilot' })).toThrow(/DATABASE_URL/);
  });

  it('refuses an invalid PORT', () => {
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('never prints the value of a variable', () => {
    const attempt = () => loadEnv({ ...valid, PORT: '99999999' });

    expect(attempt).toThrow(InvalidEnvError);
    expect(attempt).not.toThrow(/s3cret-value/);
  });
});

describe('loadEnv in production', () => {
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: `${valid.DATABASE_URL}?sslmode=require&uselibpqcompat=true`,
  };

  it('accepts an encrypted connection with real credentials', () => {
    expect(loadEnv(production).NODE_ENV).toBe('production');
    expect(
      loadEnv({ ...production, DATABASE_URL: `${valid.DATABASE_URL}?sslmode=verify-full` })
        .NODE_ENV,
    ).toBe('production');
  });

  // SEG-16: sin secretos por defecto.
  it('refuses the example credentials', () => {
    const example = 'postgresql://devpilot:devpilot@db:5432/devpilot?sslmode=require';

    expect(() => loadEnv({ ...production, DATABASE_URL: example })).toThrow(/example credentials/);
    expect(loadEnv({ DATABASE_URL: example, NODE_ENV: 'development' }).NODE_ENV).toBe(
      'development',
    );
  });

  // SEG-04: TLS en la conexión a la base de datos.
  it('refuses a database connection that is not encrypted', () => {
    expect(() => loadEnv({ ...production, DATABASE_URL: valid.DATABASE_URL })).toThrow(/sslmode/);
    expect(() =>
      loadEnv({ ...production, DATABASE_URL: `${valid.DATABASE_URL}?sslmode=disable` }),
    ).toThrow(/sslmode/);
  });
});
