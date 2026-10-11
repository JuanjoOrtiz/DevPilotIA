export interface IssuedAccessToken {
  token: string;
  /** Segundos de validez. */
  expiresIn: number;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface TokenSubject {
  userId: string;
}

/**
 * Emite y comprueba los tokens de sesión. `verify…` devuelve `null` ante cualquier token
 * que no sea válido: caducado, manipulado, firmado con otra clave o de otro tipo.
 */
export interface TokenService {
  issueAccessToken(userId: string): Promise<IssuedAccessToken>;
  verifyAccessToken(token: string): Promise<TokenSubject | null>;
  issueRefreshToken(userId: string): Promise<IssuedRefreshToken>;
  verifyRefreshToken(token: string): Promise<TokenSubject | null>;
  /** Hash con el que se guarda y se busca un refresh token. */
  hashRefreshToken(token: string): string;
}
