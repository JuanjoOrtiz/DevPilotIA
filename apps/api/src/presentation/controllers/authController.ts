import {
  loginRequestSchema,
  registerRequestSchema,
  type CurrentUserResponse,
  type SessionResponse,
} from '@devpilot/shared';
import type { RequestHandler, Response } from 'express';
import type { Session } from '../../application/dto/Session.js';
import type { GetCurrentUser } from '../../application/use-cases/GetCurrentUser.js';
import type { LoginUser } from '../../application/use-cases/LoginUser.js';
import type { LogoutUser } from '../../application/use-cases/LogoutUser.js';
import type { RefreshSession } from '../../application/use-cases/RefreshSession.js';
import type { RegisterUser } from '../../application/use-cases/RegisterUser.js';
import { authenticatedUserId } from '../http/authentication.js';
import {
  clearRefreshCookie,
  readCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
  type CookieSettings,
} from '../http/cookies.js';
import { parseBody } from '../validators/parseBody.js';

export interface AuthUseCases {
  registerUser: RegisterUser;
  loginUser: LoginUser;
  refreshSession: RefreshSession;
  logoutUser: LogoutUser;
  getCurrentUser: GetCurrentUser;
}

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
}

export function createAuthController(
  useCases: AuthUseCases,
  cookies: CookieSettings,
): AuthController {
  /** El refresh token va en la cookie; el cuerpo lleva solo lo que el frontend puede ver. */
  function sendSession(res: Response, status: number, session: Session): void {
    setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt, cookies);

    const body: SessionResponse = {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: session.user,
    };
    res.status(status).json(body);
  }

  return {
    register: async (req, res) => {
      const input = parseBody(registerRequestSchema, req.body);
      sendSession(res, 201, await useCases.registerUser.execute(input));
    },

    login: async (req, res) => {
      const input = parseBody(loginRequestSchema, req.body);
      sendSession(res, 200, await useCases.loginUser.execute(input));
    },

    refresh: async (req, res) => {
      const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE);
      try {
        sendSession(res, 200, await useCases.refreshSession.execute(refreshToken));
      } catch (error) {
        // Una cookie que ya no vale se retira: el navegador deja de enviarla.
        clearRefreshCookie(res, cookies);
        throw error;
      }
    },

    logout: async (req, res) => {
      const refreshToken = readCookie(req.headers.cookie, REFRESH_COOKIE);
      await useCases.logoutUser.execute(authenticatedUserId(res), refreshToken);

      clearRefreshCookie(res, cookies);
      res.status(204).end();
    },

    me: async (_req, res) => {
      const body: CurrentUserResponse = {
        user: await useCases.getCurrentUser.execute(authenticatedUserId(res)),
      };
      res.json(body);
    },
  };
}
