import { describe, expect, it } from 'vitest';
import {
  SPEC_EXPORT_SCHEMA_URL,
  specificationExportJsonSchema,
  specificationExportSchema,
} from './export.js';

// RF-EXP-02. Que el fichero publicado coincida lo comprueba la API, que tiene acceso a disco.
describe('specification export schema', () => {
  it('describes itself with the address every export points to', () => {
    expect(specificationExportJsonSchema()).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: SPEC_EXPORT_SCHEMA_URL,
    });
    expect(SPEC_EXPORT_SCHEMA_URL).toMatch(
      /\/docs\/schemas\/specification-export\.v1\.schema\.json$/,
    );
  });

  it('refuses an export without its context', () => {
    expect(specificationExportSchema.safeParse({ specification: {} }).success).toBe(false);
  });
});
