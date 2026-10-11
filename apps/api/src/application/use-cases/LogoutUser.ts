import type { Clock } from '../../domain/providers/Clock.js';
import type { TokenService } from '../../domain/providers/TokenService.js';
import type { RefreshTokenRepository } from '../../domain/repositories/RefreshTokenRepository.js';

/** RF-AUT-04: invalida en el servidor el refresh token de la sesión que se cierra. */
export class LogoutUser {
  private readonly refreshTokens: RefreshTokenRepository;
  private readonly tokens: TokenService;
  private readonly clock: Clock;

  constructor(refreshTokens: RefreshTokenRepository, tokens: TokenService, clock: Clock) {
    this.refreshTokens = refreshTokens;
    this.tokens = tokens;
    this.clock = clock;
  }

  /**
   * Cerrar sesión nunca falla: sin token, o con uno desconocido o ya revocado, no hay
   * nada que invalidar. Solo se revoca un token que pertenece al usuario que lo pide.
   */
  async execute(userId: string, refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    const stored = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(refreshToken));
    if (!stored || stored.userId !== userId) return;

    await this.refreshTokens.revokeIfActive(stored.id, this.clock.now());
  }
}
