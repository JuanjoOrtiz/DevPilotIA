import { ErrorBoundary } from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './App';
import { AppCrashPage } from './components/pages/AppCrashPage/AppCrashPage';
import { SessionProvider } from './features/auth/SessionContext';
import './i18n';
import { initMonitoring } from './services/monitoring';
import { createQueryClient } from './services/queryClient';
import './styles/global.css';

// Antes de pintar nada, para que también un fallo del primer render llegue a Sentry.
initMonitoring();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const queryClient = createQueryClient();
// Router «de datos»: lo necesita useBlocker para avisar de los cambios sin guardar
// (RF-EDI-04). Las rutas siguen declaradas en App.tsx.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(root).render(
  <StrictMode>
    {/* RNF-15: un error de render no deja la pantalla en blanco y llega a Sentry. */}
    <ErrorBoundary fallback={<AppCrashPage />}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
