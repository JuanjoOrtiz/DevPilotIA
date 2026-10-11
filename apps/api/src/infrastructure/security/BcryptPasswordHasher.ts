import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.js';

/** Coste de bcrypt: 2^12 rondas, unas décimas de segundo por contraseña. */
const DEFAULT_COST = 12;

/** SEG-04: contraseñas con bcrypt. Cada hash lleva su propia sal y su coste. */
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly cost: number;

  constructor(cost = DEFAULT_COST) {
    this.cost = cost;
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      // Un hash con formato desconocido no da acceso.
      return false;
    }
  }
}
