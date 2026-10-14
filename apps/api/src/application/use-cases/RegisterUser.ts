import type { RegisterRequest } from '@devpilot/shared';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { Session } from '../dto/Session.js';
import type { SampleProjectProvisioner } from '../services/SampleProjectProvisioner.js';
import type { SessionIssuer } from '../services/SessionIssuer.js';
import type { AuthProtection, RequestContext } from '../services/AuthProtection.js';

/** RF-AUT-01: crea la cuenta y deja la sesión iniciada. */
export class RegisterUser {
  private readonly users: UserRepository;
  private readonly hasher: PasswordHasher;
  private readonly sessions: SessionIssuer;
  private readonly samples: Pick<SampleProjectProvisioner, 'provision'> | undefined;
  private readonly protection: AuthProtection | undefined;

  constructor(
    users: UserRepository,
    hasher: PasswordHasher,
    sessions: SessionIssuer,
    /** RF-PRO-06: el proyecto de ejemplo de la cuenta nueva. */
    samples?: Pick<SampleProjectProvisioner, 'provision'>,
    /** RNF-04: límite de registros por IP. */
    protection?: AuthProtection,
  ) {
    this.users = users;
    this.hasher = hasher;
    this.sessions = sessions;
    this.samples = samples;
    this.protection = protection;
  }

  /** La entrada llega validada y con el email normalizado. */
  async execute(input: RegisterRequest, context: RequestContext = {}): Promise<Session> {
    // Cuenta cada intento, salga bien o mal: frena la creación masiva de cuentas.
    const limiter = this.protection?.limiter;
    if (limiter) {
      const byIp = { rule: limiter.rules.registerByIp, value: context.ip };
      await limiter.assertAllowed([byIp], context.ip);
      await limiter.record([byIp]);
    }

    const passwordHash = await this.hasher.hash(input.password);
    // El repositorio rechaza un email repetido; así no hay carrera entre comprobar y crear.
    const user = await this.users.create({ name: input.name, email: input.email, passwordHash });

    // El ejemplo es un extra: si no se puede crear, la cuenta ya existe y se entra igual.
    try {
      await this.samples?.provision(user.id);
    } catch (error) {
      console.error('Could not create the sample project', user.id, error);
    }

    return this.sessions.issueFor(user);
  }
}
