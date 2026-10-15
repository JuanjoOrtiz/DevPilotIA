// Escribe la especificación OpenAPI en un fichero (RNF-17): `npm run openapi -- openapi.json`.
// El CI la publica como artefacto en cada cambio; el documento sale de los esquemas Zod.
import { writeFile } from 'node:fs/promises';
import { buildOpenApiDocument } from './presentation/openapi/openApiDocument.js';

const target = process.argv[2] ?? 'openapi.json';
const version = process.env.APP_VERSION ?? process.env.GITHUB_SHA ?? 'dev';

await writeFile(target, `${JSON.stringify(buildOpenApiDocument(version), null, 2)}\n`);
console.log(`OpenAPI ${version} written to ${target}`);
