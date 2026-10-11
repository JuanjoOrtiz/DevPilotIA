import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router';
import { LoadingScreen } from './components/molecules/LoadingScreen/LoadingScreen';
import { AppShell } from './components/pages/AppShell/AppShell';
import { EditProjectPage } from './components/pages/EditProjectPage/EditProjectPage';
import { LoginPage } from './components/pages/LoginPage/LoginPage';
import { NewProjectPage } from './components/pages/NewProjectPage/NewProjectPage';
import { ProjectDetailPage } from './components/pages/ProjectDetailPage/ProjectDetailPage';
import { ProjectsPage } from './components/pages/ProjectsPage/ProjectsPage';
import { RegisterPage } from './components/pages/RegisterPage/RegisterPage';
import { GuestOnly, RequireSession } from './features/auth/RouteGuards';
import { ROUTE_PATTERNS, ROUTES } from './routes';

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
          <Route path={ROUTES.projects} element={<ProjectsPage />} />
          <Route path={ROUTES.newProject} element={<NewProjectPage />} />
          <Route path={ROUTE_PATTERNS.project} element={<ProjectDetailPage />} />
          <Route path={ROUTE_PATTERNS.editProject} element={<EditProjectPage />} />
        </Route>
        {/* La página de entrada, y cualquier dirección que no exista, llevan a los proyectos. */}
        <Route path="*" element={<Navigate to={ROUTES.projects} replace />} />
      </Route>
    </Routes>
  );
}
