import type { User } from '../../domain/entities/User.js';
import type { TokenService } from '../../domain/providers/TokenService.js';
import type { RefreshTokenRepository } from '../../domain/repositories/RefreshTokenRepository.js';
import { toPublicUser, type Session } from '../dto/Session.js';

/** Abre una sesión: emite los dos tokens y guarda el hash del refresh token. */
export class SessionIssuer {
  private readonly tokens: TokenService;
  private readonly refreshTokens: RefreshTokenRepository;

  constructor(tokens: TokenService, refreshTokens: RefreshTokenRepository) {
    this.tokens = tokens;
    this.refreshTokens = refreshTokens;
  }

  async issueFor(user: User): Promise<Session> {
    const access = await this.tokens.issueAccessToken(user.id);
    const refresh = await this.tokens.issueRefreshToken(user.id);

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.tokens.hashRefreshToken(refresh.token),
      expiresAt: refresh.expiresAt,
    });

    return {
      user: toPublicUser(user),
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }
}
