import { z } from 'zod';

/** Respuesta de `GET /api/v1/health`. Con la base de datos caída la API responde 503. */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
