import type { User } from '@devpilot/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { SessionProvider } from '../features/auth/SessionContext';

export const lucia: User = {
  id: '7b0a8a5e-1111-4222-8333-444455556666',
  name: 'Lucía Ferrer',
  email: 'lucia@example.com',
  createdAt: '2026-10-11T10:00:00.000Z',
};

/** Los proveedores de la aplicación, con el router en memoria. */
export function AppProviders({ path = '/', children }: { path?: string; children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/** La aplicación entera, como en main.tsx, abierta en la ruta indicada. */
export function renderApp(path = '/') {
  const user = userEvent.setup();
  const view = render(
    <AppProviders path={path}>
      <App />
    </AppProviders>,
  );
  return { user, ...view };
}
