import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher } from './BcryptPasswordHasher.js';

// Coste mínimo: en los tests importa el comportamiento, no la resistencia.
const hasher = new BcryptPasswordHasher(4);

describe('BcryptPasswordHasher', () => {
  it('verifies the password it hashed and no other', async () => {
    const hash = await hasher.hash('correct horse battery');

    expect(await hasher.verify('correct horse battery', hash)).toBe(true);
    expect(await hasher.verify('correct horse batterx', hash)).toBe(false);
  });

  it('produces a bcrypt hash that does not contain the password', async () => {
    const hash = await hasher.hash('correct horse battery');

    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).not.toContain('correct horse battery');
  });

  it('salts every hash: the same password never gives the same hash', async () => {
    expect(await hasher.hash('same password')).not.toBe(await hasher.hash('same password'));
  });

  it('uses a cost of 12 unless told otherwise', async () => {
    expect(await new BcryptPasswordHasher().hash('x')).toMatch(/^\$2[aby]\$12\$/);
  });

  it('does not accept a hash it cannot read', async () => {
    expect(await hasher.verify('anything', 'not-a-bcrypt-hash')).toBe(false);
    expect(await hasher.verify('anything', '')).toBe(false);
  });
});
