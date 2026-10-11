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

  return {
    clock,
    users,
    refreshTokens,
    hasher,
    tokens,
    registerUser: new RegisterUser(users, hasher, sessions),
    loginUser: new LoginUser(users, hasher, sessions),
    refreshSession: new RefreshSession({ users, refreshTokens, tokens, sessions, clock }),
    logoutUser: new LogoutUser(refreshTokens, tokens, clock),
    getCurrentUser: new GetCurrentUser(users),
  };
}

export const lucia = {
  name: 'Lucía Ferrer',
  email: 'lucia@example.com',
  password: 'correct horse battery',
};
