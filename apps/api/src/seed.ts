// Seed de datos de demostración: `npm run db:seed`. No forma parte de la API desplegada.
//
// Contra una base de datos local crea, si no existe, el usuario de ejemplo SEED_EMAIL /
// SEED_PASSWORD, con valores por defecto documentados en docs/deployment.md. Contra
// cualquier otra, o con NODE_ENV=production, exige SEED_EMAIL de una cuenta ya registrada
// y nunca crea usuarios (SEG-16).
import { z } from 'zod';
import { createPrismaClient } from './infrastructure/database/prismaClient.js';
import { SeedError, seedDemoData } from './infrastructure/database/seed/seedDemoData.js';
import { seedModeFor } from './infrastructure/database/seed/seedMode.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';

const LOCAL_DEFAULTS = { email: 'demo@example.com', password: 'devpilot-demo' };

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  NODE_ENV: z.string().optional(),
  SEED_EMAIL: z.email().optional(),
  SEED_PASSWORD: z.string().min(8).optional(),
});

async function main(): Promise<void> {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new SeedError(
      `Invalid environment: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  const env = parsed.data;
  const mode = seedModeFor(env.DATABASE_URL, env.NODE_ENV);
  if (mode === 'production' && !env.SEED_EMAIL) {
    throw new SeedError('SEED_EMAIL is required in production: the email of an existing account.');
  }

  const prisma = createPrismaClient(env.DATABASE_URL);
  try {
    const result = await seedDemoData(prisma, {
      mode,
      email: env.SEED_EMAIL ?? LOCAL_DEFAULTS.email,
      password: env.SEED_PASSWORD ?? LOCAL_DEFAULTS.password,
      hashPassword: (password) => new BcryptPasswordHasher().hash(password),
      now: new Date(),
    });
    console.log(
      `Seed (${mode}): ${result.projects} projects and ${result.generations} generations` +
        (result.createdUser ? ' for a new user.' : ' for an existing account.'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof SeedError ? error.message : error);
  process.exit(1);
});
