// Arranque en Vercel: la aplicación se exporta y Vercel la ejecuta como una función.
// En desarrollo y en Docker no se usa este fichero, sino main.ts.
import { attachDatabasePool } from '@vercel/functions';
// Vercel reconoce el punto de entrada porque importa de 'express': este import tiene
// que seguir en el JavaScript compilado, así que no puede ser un `import type`.
import express from 'express';
import { compose } from './composition.js';
import { loadEnv } from './infrastructure/config/env.js';

// Varias instancias de la función pueden convivir y el pooler de Supabase admite pocas
// conexiones en el plan gratuito: cada instancia usa como mucho 3 y las suelta pronto.
const DATABASE_POOL = { max: 3, idleTimeoutMillis: 5_000 };

// Si la configuración no es válida, loadEnv lanza y la función no llega a arrancar;
// el registro de Vercel nombra las variables que fallan, nunca sus valores.
const { app, database } = compose(loadEnv(), { databasePool: DATABASE_POOL });

// Vercel suspende la instancia entre peticiones: así cierra antes las conexiones sin uso.
attachDatabasePool(database.pool);

const handler: express.Express = app;
export default handler;
