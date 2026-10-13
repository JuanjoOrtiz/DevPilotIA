/**
 * Trabajo que sigue después de responder, como una generación tras el 202. En Vercel la
 * instancia se mantiene viva hasta que termina (`waitUntil`); en un servidor, sin más.
 */
export interface BackgroundTasks {
  run(task: () => Promise<void>): void;
}
