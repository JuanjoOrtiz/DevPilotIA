import type { RefreshToken } from '../entities/RefreshToken.js';

export interface NewRefreshToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(token: NewRefreshToken): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  /**
   * Revoca el token solo si seguía activo y dice si lo ha hecho. Debe ser atómico:
   * de dos peticiones simultáneas con el mismo token, solo una recibe `true`.
   */
  revokeIfActive(id: string, at: Date): Promise<boolean>;
  /** Cierra todas las sesiones de un usuario. */
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}
