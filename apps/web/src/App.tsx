import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router';
import { LoadingScreen } from './components/molecules/LoadingScreen/LoadingScreen';
import { AppShell } from './components/pages/AppShell/AppShell';
import { EditGenerationPage } from './components/pages/EditGenerationPage/EditGenerationPage';
import { EditProjectPage } from './components/pages/EditProjectPage/EditProjectPage';
import { GenerationPage } from './components/pages/GenerationPage/GenerationPage';
import { LoginPage } from './components/pages/LoginPage/LoginPage';
import { NewGenerationPage } from './components/pages/NewGenerationPage/NewGenerationPage';
import { NewProjectPage } from './components/pages/NewProjectPage/NewProjectPage';
import { ProjectDetailPage } from './components/pages/ProjectDetailPage/ProjectDetailPage';
import { ProjectsPage } from './components/pages/ProjectsPage/ProjectsPage';
import { RegisterPage } from './components/pages/RegisterPage/RegisterPage';
import { GuestOnly, RequireSession } from './features/auth/RouteGuards';
import { ROUTE_PATTERNS, ROUTES } from './routes';

// Las gráficas (Recharts) pesan: el dashboard se descarga aparte, en su propio fichero.
const DashboardPage = lazy(() =>
  import('./components/pages/DashboardPage/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

/** Rutas de la aplicación. Todo lo que no es login o registro exige sesión (RF-AUT-05). */
export function App() {
  const { t } = useTranslation();
  const loading = <LoadingScreen label={t('app.loading')} />;

  return (
    <Routes>
      <Route element={<GuestOnly loading={loading} />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
      </Route>

      <Route element={<RequireSession loading={loading} />}>
        <Route element={<AppShell />}>
          <Route
            path={ROUTES.dashboard}
            element={
              <Suspense fallback={loading}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route path={ROUTES.projects} element={<ProjectsPage />} />
          <Route path={ROUTES.newProject} element={<NewProjectPage />} />
          <Route path={ROUTE_PATTERNS.project} element={<ProjectDetailPage />} />
          <Route path={ROUTE_PATTERNS.editProject} element={<EditProjectPage />} />
          <Route path={ROUTE_PATTERNS.newGeneration} element={<NewGenerationPage />} />
          <Route path={ROUTE_PATTERNS.generation} element={<GenerationPage />} />
          <Route path={ROUTE_PATTERNS.editGeneration} element={<EditGenerationPage />} />
        </Route>
        {/* La página de entrada, y cualquier dirección que no exista, llevan al dashboard. */}
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Route>
    </Routes>
  );
}
