import { z } from 'zod';
import { generationTypeSchema } from './generation.js';
import { specLanguageSchema } from './generationDetail.js';
import { specificationSchema } from './specification.js';

/** Formatos de exportación de una especificación (RF-EXP-01 y 02). */
export const EXPORT_FORMATS = ['md', 'json'] as const;
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

/**
 * Versión del fichero JSON exportado (RF-EXP-02). Sube solo con un cambio incompatible, y
 * con ella el nombre del esquema publicado en `docs/schemas/`.
 */
export const SPEC_EXPORT_VERSION = 1;

/** Dónde se publica el JSON Schema del fichero exportado: el `$schema` de cada exportación. */
export const SPEC_EXPORT_SCHEMA_URL =
  'https://raw.githubusercontent.com/JuanjoOrtiz/DevPilotIA/main/docs/schemas/specification-export.v1.schema.json';

const timestamp = z.iso.datetime();

/**
 * El fichero JSON exportado (RF-EXP-02): un sobre con el contexto que DevPilot conoce y,
 * dentro, la especificación tal cual, con su propio `schemaVersion`. Así queda separado lo
 * que escribió la IA (o el usuario al editar) de lo que añade la aplicación.
 */
export const specificationExportSchema = z
  .object({
    $schema: z.literal(SPEC_EXPORT_SCHEMA_URL),
    exportVersion: z.literal(SPEC_EXPORT_VERSION),
    exportedAt: timestamp.meta({ description: 'Fecha de la exportación, en UTC' }),
    language: specLanguageSchema.meta({
      description: 'Idioma en que está escrita la especificación',
    }),
    project: z.object({ name: z.string().min(1) }),
    generation: z.object({
      id: z.uuid(),
      type: generationTypeSchema.meta({ description: 'Funcionalidad (`feature`) o bug (`bug`)' }),
      createdAt: timestamp,
      completedAt: timestamp.nullable(),
      edited: z.boolean().meta({ description: 'Si la especificación es la versión editada' }),
      editedAt: timestamp.nullable(),
    }),
    specification: specificationSchema,
  })
  .meta({
    title: 'DevPilot AI: especificación exportada',
    description:
      'Una especificación técnica generada con DevPilot AI y el contexto de su generación.',
  });
export type SpecificationExport = z.infer<typeof specificationExportSchema>;

/**
 * El JSON Schema publicado (2020-12), generado desde el esquema Zod: nunca se escribe a
 * mano. `npm run schemas -w @devpilot/shared` lo escribe en `docs/schemas/` y un test
 * comprueba que el fichero no se ha quedado atrás.
 */
export function specificationExportJsonSchema(): Record<string, unknown> {
  const { $schema, ...rest } = z.toJSONSchema(specificationExportSchema, {
    target: 'draft-2020-12',
    io: 'output',
    unrepresentable: 'any',
  });
  return { $schema, $id: SPEC_EXPORT_SCHEMA_URL, ...rest };
}
