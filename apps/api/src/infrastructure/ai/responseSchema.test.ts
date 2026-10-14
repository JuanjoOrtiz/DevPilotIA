import { describe, expect, it } from 'vitest';
import { responseSchemaFor, type GeminiSchema } from './responseSchema.js';

/** Recorre el esquema y devuelve las claves que Gemini no admite en `responseSchema`. */
function unsupportedKeys(schema: GeminiSchema): string[] {
  const allowed = new Set([
    'type',
    'description',
    'enum',
    'properties',
    'propertyOrdering',
    'required',
    'items',
  ]);
  const own = Object.keys(schema).filter((key) => !allowed.has(key));
  const nested = [
    ...Object.values(schema.properties ?? {}),
    ...(schema.items ? [schema.items] : []),
  ].flatMap(unsupportedKeys);
  return [...own, ...nested];
}

describe('responseSchemaFor', () => {
  it('uses only the keys Gemini accepts', () => {
    expect(unsupportedKeys(responseSchemaFor('questions-or-specification'))).toEqual([]);
    expect(unsupportedKeys(responseSchemaFor('specification'))).toEqual([]);
  });

  // Gemini 3.x rechaza con un 400 un esquema que limita el número de elementos.
  it('never limits the number of items of a list', () => {
    const text = JSON.stringify(responseSchemaFor('questions-or-specification'));

    expect(text).not.toContain('minItems');
    expect(text).not.toContain('maxItems');
  });

  it('lets the first call choose and forces a specification in the second', () => {
    expect(responseSchemaFor('questions-or-specification').properties?.kind?.enum).toEqual([
      'questions',
      'specification',
    ]);
    expect(responseSchemaFor('specification')).toMatchObject({
      properties: { kind: { enum: ['specification'] } },
      required: ['kind', 'specification'],
    });
  });

  it('keeps the sizes and severities as enums', () => {
    const specification = responseSchemaFor('specification').properties?.specification;

    expect(specification?.properties?.complexity?.properties?.size?.enum).toEqual([
      'S',
      'M',
      'L',
      'XL',
    ]);
    expect(specification?.properties?.risks?.items?.properties?.severity?.enum).toEqual([
      'low',
      'medium',
      'high',
    ]);
  });
});
