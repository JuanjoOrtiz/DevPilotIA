import type { User as PublicUser } from '@devpilot/shared';
import type { User } from '../../domain/entities/User.js';

/** Lo que devuelven registro, login y refresh: el usuario y sus dos tokens. */
export interface Session {
  user: PublicUser;
  accessToken: string;
  /** Segundos de validez del access token. */
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/** El usuario que puede salir de la API: sin el hash de la contraseña. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
