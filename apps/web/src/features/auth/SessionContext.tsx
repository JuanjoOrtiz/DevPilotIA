import type { LoginRequest, RegisterRequest, User } from '@devpilot/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onSessionExpired } from '../../services/apiClient';
import * as authService from '../../services/authService';

export type SessionState =
  /** Al cargar la página, mientras se comprueba si la cookie de refresh sigue valiendo. */
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: User };

interface SessionContextValue {
  session: SessionState;
  /** La sesión se cerró sola porque caducó, no porque el usuario saliera. */
  expired: boolean;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const ANONYMOUS: SessionState = { status: 'anonymous', user: null };

/**
 * Sesión del usuario para toda la aplicación. El access token no está aquí ni en ningún
 * almacenamiento del navegador: lo guarda `apiClient` en memoria (RF-AUT-03).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading', user: null });
  const [expired, setExpired] = useState(false);
  const queryClient = useQueryClient();

  /** Al cambiar de sesión no puede quedar en caché nada de la anterior (RNF-06). */
  const end = useCallback(
    (reason: 'expired' | 'signedOut') => {
      queryClient.clear();
      setExpired(reason === 'expired');
      setSession(ANONYMOUS);
    },
    [queryClient],
  );

  useEffect(() => {
    let cancelled = false;

    authService.restoreSession().then(
      (user) => {
        if (!cancelled) setSession(user ? { status: 'authenticated', user } : ANONYMOUS);
      },
      () => {
        // Sin conexión o con la API caída no se puede saber: se trata como sin sesión.
        if (!cancelled) setSession(ANONYMOUS);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onSessionExpired(() => end('expired')), [end]);

  const start = useCallback(
    (user: User) => {
      queryClient.clear();
      setExpired(false);
      setSession({ status: 'authenticated', user });
    },
    [queryClient],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      expired,
      login: async (input) => start(await authService.login(input)),
      register: async (input) => start(await authService.register(input)),
      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Sin conexión no se pudo avisar al servidor; esta pestaña sale igualmente.
        } finally {
          end('signedOut');
        }
      },
    }),
    [session, expired, start, end],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside a SessionProvider');
  return context;
}
