// Escribe en docs/schemas/ el JSON Schema publicado del fichero exportado (RF-EXP-02).
// Se ejecuta con `npm run schemas -w @devpilot/shared` después de cambiar el esquema.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { specificationExportJsonSchema } from '../dist/index.js';

const target = fileURLToPath(
  new URL('../../../docs/schemas/specification-export.v1.schema.json', import.meta.url),
);
const options = await prettier.resolveConfig(target);
const content = await prettier.format(JSON.stringify(specificationExportJsonSchema()), {
  ...options,
  parser: 'json',
});
await writeFile(target, content);
console.log(`Written ${target}`);
