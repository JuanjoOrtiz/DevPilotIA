import { loadEnv, type Env } from '../infrastructure/config/env.js';

/** Secretos solo para tests: así los tests no dependen de lo que haya en el entorno. */
export const TEST_SECRETS = {
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789-abcdefghij',
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789-abcdefghi',
};

/** Entorno de los tests: lo que haya en el proceso (DATABASE_URL en el CI) más los secretos. */
export function testEnv(overrides: Record<string, string | undefined> = {}): Env {
  // Todos los tests llegan desde la misma IP: el límite de registros no debe frenarlos.
  return loadEnv({
    ...process.env,
    ...TEST_SECRETS,
    AUTH_REGISTER_LIMIT_PER_IP: '100000',
    AUTH_LOGIN_LIMIT_PER_IP: '100000',
    ...overrides,
  });
}
