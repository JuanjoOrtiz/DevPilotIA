import type { User } from '../entities/User.js';

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  /** El email llega ya normalizado, en minúsculas. */
  findByEmail(email: string): Promise<User | null>;
  /** Lanza `EMAIL_ALREADY_REGISTERED` si el email ya tiene cuenta. */
  create(user: NewUser): Promise<User>;
}
