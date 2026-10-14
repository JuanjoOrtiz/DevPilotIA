// Prueba temporal: qué parte de la petición rechaza Gemini. Se borra después.
import { readFileSync } from 'node:fs';
const key = process.env.GKEY;
const model = process.argv[2] ?? 'gemini-3.5-flash-lite';
if (!key) { console.log('Falta GKEY: ejecuta  export GKEY'); process.exit(1); }
const base = JSON.parse(readFileSync('gemini-first.json', 'utf8'));
const jsonSchema = JSON.parse(readFileSync('gemini-jsonschema.json', 'utf8'));
const strip = (node, keys) => JSON.parse(JSON.stringify(node), (k, v) => (keys.includes(k) ? undefined : v));
const variant = (fn) => { const b = structuredClone(base); fn(b); return b; };
const cases = {
  'actual (responseSchema)': base,
  'sin responseSchema': variant((b) => delete b.generationConfig.responseSchema),
  'sin propertyOrdering': variant((b) => (b.generationConfig.responseSchema = strip(b.generationConfig.responseSchema, ['propertyOrdering']))),
  'sin minItems/maxItems': variant((b) => (b.generationConfig.responseSchema = strip(b.generationConfig.responseSchema, ['minItems', 'maxItems']))),
  'sin systemInstruction': variant((b) => delete b.systemInstruction),
  'responseJsonSchema': variant((b) => { delete b.generationConfig.responseSchema; b.generationConfig.responseJsonSchema = jsonSchema; }),
};
for (const [name, body] of Object.entries(cases)) {
  const started = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  }).catch((e) => ({ status: 'ERR ' + e.name, json: async () => ({}) }));
  const data = await res.json().catch(() => ({}));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const detail = data.error ? data.error.message : (data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '').slice(0, 80);
  console.log(`${name.padEnd(26)} HTTP ${res.status} ${seconds}s  ${detail}`);
}
