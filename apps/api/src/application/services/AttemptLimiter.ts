import { DomainError } from '../../domain/errors/DomainError.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { SecurityLog } from '../../domain/providers/SecurityLog.js';
import type {
  AttemptScope,
  AuthAttemptRepository,
} from '../../domain/repositories/AuthAttemptRepository.js';

export interface AttemptRule {
  scope: AttemptScope;
  /** `email` o `ip`: forma parte de la clave, para no mezclar contadores. */
  kind: string;
  max: number;
  windowMs: number;
}

const MINUTE = 60 * 1000;

export interface AttemptLimits {
  /** Logins fallidos por email cada 15 minutos (5 por defecto). */
  loginPerEmail: number;
  /** Logins fallidos por IP cada 15 minutos (20 por defecto). */
  loginPerIp: number;
  /** Registros por IP cada hora (10 por defecto). */
  registerPerIp: number;
}

export interface AttemptRules {
  loginByEmail: AttemptRule;
  loginByIp: AttemptRule;
  registerByIp: AttemptRule;
}

/** Límites de RNF-04 y SEG-07. */
export function attemptRules(limits: AttemptLimits): AttemptRules {
  return {
    loginByEmail: {
      scope: 'login',
      kind: 'email',
      max: limits.loginPerEmail,
      windowMs: 15 * MINUTE,
    },
    loginByIp: { scope: 'login', kind: 'ip', max: limits.loginPerIp, windowMs: 15 * MINUTE },
    registerByIp: {
      scope: 'register',
      kind: 'ip',
      max: limits.registerPerIp,
      windowMs: 60 * MINUTE,
    },
  };
}

export const DEFAULT_ATTEMPT_LIMITS: AttemptLimits = {
  loginPerEmail: 5,
  loginPerIp: 20,
  registerPerIp: 10,
};

export interface AttemptKey {
  rule: AttemptRule;
  /** El email normalizado o la IP. El repositorio guarda su hash. */
  value: string | null | undefined;
}

/**
 * Limita los intentos de autenticación por email y por IP. Al pasarse responde 429
 * `TOO_MANY_ATTEMPTS` con los segundos que faltan para volver a intentarlo.
 */
export class AttemptLimiter {
  private readonly attempts: AuthAttemptRepository;
  private readonly clock: Clock;
  private readonly log: SecurityLog;
  readonly rules: AttemptRules;

  constructor(
    attempts: AuthAttemptRepository,
    clock: Clock,
    log: SecurityLog,
    limits: AttemptLimits = DEFAULT_ATTEMPT_LIMITS,
  ) {
    this.attempts = attempts;
    this.clock = clock;
    this.log = log;
    this.rules = attemptRules(limits);
  }

  /** Lanza `TOO_MANY_ATTEMPTS` si alguna clave ya ha agotado su cupo. */
  async assertAllowed(keys: AttemptKey[], ip?: string | null): Promise<void> {
    const now = this.clock.now().getTime();
    for (const { rule, value } of keys) {
      if (!value) continue;
      const key = `${rule.kind}:${value}`;
      const since = new Date(now - rule.windowMs);
      if ((await this.attempts.countSince(rule.scope, key, since)) < rule.max) continue;

      const oldest = await this.attempts.oldestSince(rule.scope, key, since);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(((oldest?.getTime() ?? now) + rule.windowMs - now) / 1000),
      );
      this.log.record({ type: 'limit_reached', ip, detail: `${rule.scope}:${rule.kind}` });
      throw new DomainError('TOO_MANY_ATTEMPTS', 'Too many attempts', { retryAfterSeconds });
    }
  }

  async record(keys: AttemptKey[]): Promise<void> {
    const at = this.clock.now();
    await Promise.all(
      keys
        .filter(({ value }) => value)
        .map(({ rule, value }) => this.attempts.record(rule.scope, `${rule.kind}:${value}`, at)),
    );
  }

  async clear(key: AttemptKey): Promise<void> {
    if (key.value) await this.attempts.clear(key.rule.scope, `${key.rule.kind}:${key.value}`);
  }
}
