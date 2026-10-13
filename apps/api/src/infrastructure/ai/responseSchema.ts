import { clarifyingQuestionsSchema, specificationSchema } from '@devpilot/shared';
import { z } from 'zod';
import type { ResponseShape } from '../../domain/providers/LLMProvider.js';

/** Subconjunto de OpenAPI que acepta `responseSchema` en la Gemini API. */
export interface GeminiSchema {
  type: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
  description?: string;
  enum?: string[];
  properties?: Record<string, GeminiSchema>;
  propertyOrdering?: string[];
  required?: string[];
  items?: GeminiSchema;
  minItems?: number;
  maxItems?: number;
}

type JsonSchema = Record<string, unknown>;

/**
 * Convierte el JSON Schema que sale de Zod al subconjunto que entiende Gemini. Lo que no
 * cabe (longitudes, patrones, constantes) se pierde aquí, pero no importa: la respuesta se
 * valida después con el esquema Zod completo.
 */
export function toGeminiSchema(schema: JsonSchema): GeminiSchema {
  const type = schema.type;

  if (type === 'object') {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    const entries = Object.entries(properties);
    return {
      type: 'object',
      properties: Object.fromEntries(entries.map(([key, value]) => [key, toGeminiSchema(value)])),
      propertyOrdering: entries.map(([key]) => key),
      required: (schema.required as string[] | undefined) ?? [],
    };
  }
  if (type === 'array') {
    return {
      type: 'array',
      items: toGeminiSchema(schema.items as JsonSchema),
      ...(typeof schema.minItems === 'number' && { minItems: schema.minItems }),
      ...(typeof schema.maxItems === 'number' && { maxItems: schema.maxItems }),
    };
  }
  if (type === 'string') {
    const values = Array.isArray(schema.enum)
      ? (schema.enum as string[])
      : typeof schema.const === 'string'
        ? [schema.const]
        : undefined;
    return values ? { type: 'string', enum: values } : { type: 'string' };
  }
  // El único número del esquema es `schemaVersion`, una constante entera.
  if (type === 'number' || type === 'integer') return { type: 'integer' };
  if (type === 'boolean') return { type: 'boolean' };

  throw new Error(`Unsupported JSON Schema type: ${String(type)}`);
}

function fromZod(schema: z.ZodType): GeminiSchema {
  return toGeminiSchema(z.toJSONSchema(schema, { io: 'output' }) as JsonSchema);
}

/**
 * La respuesta que se pide al modelo. En la primera llamada es un objeto con `kind` y,
 * según su valor, `questions` o `specification`: así no hace falta `anyOf`. Zod comprueba
 * después que viene la parte que toca.
 */
export function responseSchemaFor(shape: ResponseShape): GeminiSchema {
  const specification = fromZod(specificationSchema);

  if (shape === 'specification') {
    return {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['specification'] }, specification },
      propertyOrdering: ['kind', 'specification'],
      required: ['kind', 'specification'],
    };
  }

  return {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['questions', 'specification'] },
      questions: fromZod(clarifyingQuestionsSchema),
      specification,
    },
    propertyOrdering: ['kind', 'questions', 'specification'],
    required: ['kind'],
  };
}
