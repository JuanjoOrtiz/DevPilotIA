import { waitUntil } from '@vercel/functions';
import type { BackgroundTasks } from '../../domain/providers/BackgroundTasks.js';

/**
 * Lanza el trabajo y, en Vercel, mantiene viva la instancia hasta que termina. Fuera de
 * Vercel `waitUntil` no hace nada y el trabajo sigue en el mismo proceso del servidor.
 */
export class WaitUntilBackgroundTasks implements BackgroundTasks {
  run(task: () => Promise<void>): void {
    const promise = task().catch((error: unknown) => {
      console.error('Background task failed', error);
    });
    waitUntil(promise);
  }
}
