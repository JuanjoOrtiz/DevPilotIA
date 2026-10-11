import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'devpilot_refresh';

/** El navegador solo envía la cookie a los endpoints de autenticación. */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

export interface CookieSettings {
  /** `Secure`: la cookie solo viaja por HTTPS. Desactivado en local, que usa HTTP. */
  secure: boolean;
}

function refreshCookieOptions(settings: CookieSettings): CookieOptions {
  return {
    // httpOnly: el JavaScript de la página no puede leerla (T-24).
    httpOnly: true,
    secure: settings.secure,
    // Strict: nunca viaja en una petición lanzada desde otro sitio. Es posible porque
    // frontend y API comparten origen.
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  settings: CookieSettings,
): void {
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions(settings), expires: expiresAt });
}

export function clearRefreshCookie(res: Response, settings: CookieSettings): void {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(settings));
}

/** Valor de una cookie a partir de la cabecera `Cookie` de la petición. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== name) continue;

    const value = pair.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
