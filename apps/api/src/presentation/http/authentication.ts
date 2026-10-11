import type { RequestHandler, Response } from 'express';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { TokenService } from '../../domain/providers/TokenService.js';

export interface PublicRoute {
  method: string;
  /** Ruta dentro de `/api/v1`, por ejemplo `/auth/login`. */
  path: string;
}

const BEARER = /^Bearer (\S+)$/;

/**
 * SEG-15: denegar por defecto. Toda petición a la API necesita un access token válido,
 * salvo las rutas de `publicRoutes`. Una ruta nueva nace protegida sin hacer nada.
 */
export function createAuthentication(
  tokens: TokenService,
  publicRoutes: readonly PublicRoute[],
): RequestHandler {
  const isPublic = (method: string, path: string) =>
    publicRoutes.some((route) => route.method === method && route.path === path);

  return async (req, res, next) => {
    if (isPublic(req.method, req.path)) {
      next();
      return;
    }

    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    const subject = token ? await tokens.verifyAccessToken(token) : null;
    if (!subject) {
      next(new DomainError('UNAUTHORIZED', 'Authentication is required'));
      return;
    }

    res.locals.userId = subject.userId;
    next();
  };
}

/** Id del usuario en sesión. Solo falla si se usa en una ruta declarada como pública. */
export function authenticatedUserId(res: Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== 'string') {
    throw new DomainError('UNAUTHORIZED', 'Authentication is required');
  }
  return userId;
}
