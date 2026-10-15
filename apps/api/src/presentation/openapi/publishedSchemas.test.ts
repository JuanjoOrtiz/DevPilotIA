import { readFile } from 'node:fs/promises';
import { specificationExportJsonSchema } from '@devpilot/shared';
import { describe, expect, it } from 'vitest';

const PUBLISHED = new URL(
  '../../../../../docs/schemas/specification-export.v1.schema.json',
  import.meta.url,
);

// RF-EXP-02: el esquema público que enlaza cada exportación es el que valida de verdad.
describe('published JSON Schema of the export', () => {
  it('matches the Zod schema (run `npm run schemas -w @devpilot/shared` after changing it)', async () => {
    const published: unknown = JSON.parse(await readFile(PUBLISHED, 'utf8'));

    expect(published).toEqual(specificationExportJsonSchema());
  });
});
