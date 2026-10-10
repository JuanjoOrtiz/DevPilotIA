import type { RequestHandler } from 'express';
import type { CheckHealth } from '../../application/use-cases/CheckHealth.js';

/** `GET /api/v1/health`: 200 si todo responde, 503 si la base de datos no está disponible. */
export function createHealthController(checkHealth: CheckHealth): RequestHandler {
  return async (_req, res) => {
    const health = await checkHealth.execute();

    res.status(health.status === 'ok' ? 200 : 503).json(health);
  };
}
