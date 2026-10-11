import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router';
import { LoadingScreen } from './components/molecules/LoadingScreen/LoadingScreen';
import { HomePage } from './components/pages/HomePage/HomePage';
import { LoginPage } from './components/pages/LoginPage/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage/RegisterPage';
import { GuestOnly, RequireSession } from './features/auth/RouteGuards';
import { ROUTES } from './features/auth/routes';

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
        <Route path={ROUTES.home} element={<HomePage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
