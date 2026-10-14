import { describe, expect, it } from 'vitest';
import { seedModeFor } from './seedMode.js';

// SEG-16: el seed no crea usuarios en producción.
describe('seedModeFor', () => {
  it('creates the sample user only against a local database outside production', () => {
    expect(seedModeFor('postgresql://devpilot:devpilot@localhost:5432/devpilot', undefined)).toBe(
      'local',
    );
    expect(seedModeFor('postgresql://devpilot:devpilot@db:5432/devpilot', 'development')).toBe(
      'local',
    );
    expect(seedModeFor('postgresql://u:p@127.0.0.1:5433/devpilot', 'test')).toBe('local');
  });

  it('is production with NODE_ENV=production, even against a local database', () => {
    expect(
      seedModeFor('postgresql://devpilot:devpilot@localhost:5432/devpilot', 'production'),
    ).toBe('production');
  });

  it('is production against any other server, even without NODE_ENV', () => {
    expect(
      seedModeFor(
        'postgresql://prisma.ref:secret@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require',
        undefined,
      ),
    ).toBe('production');
  });

  it('is production when the URL cannot be read', () => {
    expect(seedModeFor('not a url', undefined)).toBe('production');
  });
});
