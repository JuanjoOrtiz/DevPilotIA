import { AttemptLimiter } from '../application/services/AttemptLimiter.js';
import { SessionIssuer } from '../application/services/SessionIssuer.js';
import { GetCurrentUser } from '../application/use-cases/GetCurrentUser.js';
import { LoginUser } from '../application/use-cases/LoginUser.js';
import { LogoutUser } from '../application/use-cases/LogoutUser.js';
import { RefreshSession } from '../application/use-cases/RefreshSession.js';
import { RegisterUser } from '../application/use-cases/RegisterUser.js';
import {
  FakePasswordHasher,
  FakeTokenService,
  FixedClock,
  InMemoryAuthAttemptRepository,
  InMemorySecurityLog,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from './fakes.js';

/** Los casos de uso de autenticación montados sobre dobles en memoria. */
export function createAuthFixture() {
  const clock = new FixedClock();
  const users = new InMemoryUserRepository(clock);
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenService(clock);
  const sessions = new SessionIssuer(tokens, refreshTokens);
  const attempts = new InMemoryAuthAttemptRepository();
  const securityLog = new InMemorySecurityLog();
  const protection = {
    limiter: new AttemptLimiter(attempts, clock, securityLog),
    log: securityLog,
  };

  return {
    clock,
    users,
    refreshTokens,
    hasher,
    tokens,
    attempts,
    securityLog,
    protection,
    registerUser: new RegisterUser(users, hasher, sessions, undefined, protection),
    loginUser: new LoginUser(users, hasher, sessions, protection),
    refreshSession: new RefreshSession({
      users,
      refreshTokens,
      tokens,
      sessions,
      clock,
      log: securityLog,
    }),
    logoutUser: new LogoutUser(refreshTokens, tokens, clock),
    getCurrentUser: new GetCurrentUser(users),
  };
}

export const lucia = {
  name: 'Lucía Ferrer',
  email: 'lucia@example.com',
  password: 'correct horse battery',
};
