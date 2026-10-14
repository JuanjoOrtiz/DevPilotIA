import type { SeedMode } from './seedDemoData.js';

/** Servidores que solo pueden ser una base de datos local: la máquina o el servicio de Docker. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'db']);

/**
 * SEG-16: el seed solo crea usuarios contra una base de datos local y fuera de producción.
 * Cualquier otro servidor se trata como producción aunque falte NODE_ENV, para que olvidar
 * una variable no cree nunca una cuenta con contraseña conocida en la base de datos real.
 */
export function seedModeFor(databaseUrl: string, nodeEnv: string | undefined): SeedMode {
  if (nodeEnv === 'production') return 'production';
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return 'production';
  }
  return LOCAL_HOSTS.has(host) ? 'local' : 'production';
}
