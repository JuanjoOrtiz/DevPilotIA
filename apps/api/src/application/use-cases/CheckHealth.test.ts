import { describe, expect, it } from 'vitest';
import type { DatabaseHealthProbe } from '../../domain/providers/DatabaseHealthProbe.js';
import { CheckHealth } from './CheckHealth.js';

const probe = (reachable: boolean): DatabaseHealthProbe => ({
  isReachable: () => Promise.resolve(reachable),
});

describe('CheckHealth', () => {
  it('reports ok when the database responds', async () => {
    const health = await new CheckHealth(probe(true), '1.2.3').execute();

    expect(health).toEqual({ status: 'ok', database: 'up', version: '1.2.3' });
  });

  it('reports degraded when the database does not respond', async () => {
    const health = await new CheckHealth(probe(false), '1.2.3').execute();

    expect(health).toEqual({ status: 'degraded', database: 'down', version: '1.2.3' });
  });
});
