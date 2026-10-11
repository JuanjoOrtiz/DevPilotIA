/** Un refresh token emitido. Se guarda su hash, nunca el token (SEG-04). */
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  /** Fecha en que se usó o se invalidó. Un token revocado no vuelve a valer. */
  revokedAt: Date | null;
}
