import { z } from 'zod';
import { specLanguageSchema } from './generationDetail.js';

/** Formatos de exportación de una especificación. JSON llega con RF-EXP-02. */
export const EXPORT_FORMATS = ['md'] as const;
export const exportFormatSchema = z.enum(EXPORT_FORMATS);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

/**
 * Parámetros de `GET /generations/:id/export`. El idioma es el de la interfaz: decide los
 * títulos de las secciones del fichero, no el contenido, que ya está escrito.
 */
export const exportGenerationQuerySchema = z.object({
  format: exportFormatSchema.default('md'),
  language: specLanguageSchema.default('es'),
});
export type ExportGenerationQuery = z.input<typeof exportGenerationQuerySchema>;
