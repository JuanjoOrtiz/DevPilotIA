import { loadEnv, type Env } from '../infrastructure/config/env.js';

/** Secretos solo para tests: así los tests no dependen de lo que haya en el entorno. */
export const TEST_SECRETS = {
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789-abcdefghij',
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789-abcdefghi',
};

/** Entorno de los tests: lo que haya en el proceso (DATABASE_URL en el CI) más los secretos. */
export function testEnv(overrides: Record<string, string | undefined> = {}): Env {
  return loadEnv({ ...process.env, ...TEST_SECRETS, ...overrides });
}
