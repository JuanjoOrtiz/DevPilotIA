import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from './routes';
import { useSession } from './SessionContext';

interface GuardProps {
  /** Qué mostrar mientras se comprueba la sesión al cargar la página. */
  loading: ReactNode;
}

/** A dónde quería ir el usuario antes de que se le pidiera iniciar sesión. */
function requestedPath(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('from' in state)) return undefined;
  const from = state.from;
  // Solo rutas internas: nunca se redirige a una dirección que venga de fuera.
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : undefined;
}

/** RF-AUT-05: las rutas de dentro solo se ven con sesión; sin ella se va al login. */
export function RequireSession({ loading }: GuardProps) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === 'loading') return loading;
  if (session.status === 'anonymous') {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Login y registro no tienen sentido con la sesión ya iniciada. */
export function GuestOnly({ loading }: GuardProps) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === 'loading') return loading;
  if (session.status === 'authenticated') {
    return <Navigate to={requestedPath(location.state) ?? ROUTES.home} replace />;
  }
  return <Outlet />;
}
