// Dobles en memoria para los tests unitarios. No se compilan ni se despliegan.
import { randomUUID } from 'node:crypto';
import type { RefreshToken } from '../domain/entities/RefreshToken.js';
import type { User } from '../domain/entities/User.js';
import { DomainError } from '../domain/errors/DomainError.js';
import type { Clock } from '../domain/providers/Clock.js';
import type { PasswordHasher } from '../domain/providers/PasswordHasher.js';
import type {
  IssuedAccessToken,
  IssuedRefreshToken,
  TokenService,
  TokenSubject,
} from '../domain/providers/TokenService.js';
import type {
  NewRefreshToken,
  RefreshTokenRepository,
} from '../domain/repositories/RefreshTokenRepository.js';
import type { NewUser, UserRepository } from '../domain/repositories/UserRepository.js';

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

export class FixedClock implements Clock {
  private current: Date;

  constructor(start = new Date('2026-10-11T10:00:00.000Z')) {
    this.current = start;
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];
  private readonly clock: Clock;

  constructor(clock: Clock = new FixedClock()) {
    this.clock = clock;
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.email === email) ?? null);
  }

  create(input: NewUser): Promise<User> {
    if (this.users.some((user) => user.email === input.email)) {
      return Promise.reject(
        new DomainError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists'),
      );
    }
    const user: User = { id: randomUUID(), createdAt: this.clock.now(), ...input };
    this.users.push(user);
    return Promise.resolve(user);
  }

  remove(id: string): void {
    const index = this.users.findIndex((user) => user.id === id);
    if (index >= 0) this.users.splice(index, 1);
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens: RefreshToken[] = [];

  create(input: NewRefreshToken): Promise<void> {
    this.tokens.push({ id: randomUUID(), revokedAt: null, ...input });
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const found = this.tokens.find((token) => token.tokenHash === tokenHash);
    return Promise.resolve(found ? { ...found } : null);
  }

  revokeIfActive(id: string, at: Date): Promise<boolean> {
    const token = this.tokens.find((candidate) => candidate.id === id);
    if (!token || token.revokedAt !== null) return Promise.resolve(false);
    token.revokedAt = at;
    return Promise.resolve(true);
  }

  revokeAllForUser(userId: string, at: Date): Promise<void> {
    for (const token of this.tokens) {
      if (token.userId === userId && token.revokedAt === null) token.revokedAt = at;
    }
    return Promise.resolve();
  }

  activeFor(userId: string): RefreshToken[] {
    return this.tokens.filter((token) => token.userId === userId && token.revokedAt === null);
  }
}

/** «Hash» legible: deja ver en los tests qué contraseña se guardó, sin coste de CPU. */
export class FakePasswordHasher implements PasswordHasher {
  readonly verified: string[] = [];

  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed(${password})`);
  }

  verify(password: string, hash: string): Promise<boolean> {
    this.verified.push(hash);
    return Promise.resolve(hash === `hashed(${password})`);
  }
}

/** Tokens opacos y distintos en cada emisión, con la caducidad que marca el reloj. */
export class FakeTokenService implements TokenService {
  private readonly clock: Clock;
  private readonly subjects = new Map<string, { userId: string; expiresAt: Date }>();
  private counter = 0;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  issueAccessToken(userId: string): Promise<IssuedAccessToken> {
    const token = this.remember('access', userId, ACCESS_TOKEN_SECONDS * 1000);
    return Promise.resolve({ token, expiresIn: ACCESS_TOKEN_SECONDS });
  }

  verifyAccessToken(token: string): Promise<TokenSubject | null> {
    return Promise.resolve(this.read('access', token));
  }

  issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    const token = this.remember('refresh', userId, REFRESH_TOKEN_MS);
    return Promise.resolve({
      token,
      expiresAt: new Date(this.clock.now().getTime() + REFRESH_TOKEN_MS),
    });
  }

  verifyRefreshToken(token: string): Promise<TokenSubject | null> {
    return Promise.resolve(this.read('refresh', token));
  }

  hashRefreshToken(token: string): string {
    return `sha(${token})`;
  }

  private remember(kind: string, userId: string, lifetimeMs: number): string {
    this.counter += 1;
    const token = `${kind}-${this.counter}`;
    this.subjects.set(token, {
      userId,
      expiresAt: new Date(this.clock.now().getTime() + lifetimeMs),
    });
    return token;
  }

  private read(kind: string, token: string): TokenSubject | null {
    const subject = this.subjects.get(token);
    if (!subject || !token.startsWith(`${kind}-`)) return null;
    if (subject.expiresAt <= this.clock.now()) return null;
    return { userId: subject.userId };
  }
}
