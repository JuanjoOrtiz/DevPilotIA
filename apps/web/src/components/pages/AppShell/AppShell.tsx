import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { useSession } from '../../../features/auth/SessionContext';
import { useLanguageSwitch } from '../../../hooks/useLanguageSwitch';
import { ROUTES } from '../../../routes';
import { Icon } from '../../atoms/Icon/Icon';
import { LanguageSwitch } from '../../molecules/LanguageSwitch/LanguageSwitch';
import { SidebarLink } from '../../molecules/SidebarLink/SidebarLink';
import { AppSidebar } from '../../organisms/AppSidebar/AppSidebar';
import { AppLayout } from '../../templates/AppLayout/AppLayout';

/** Lo que comparten todas las páginas con sesión: la barra lateral y, dentro, la página. */
export function AppShell() {
  const { t } = useTranslation();
  const { session, logout } = useSession();
  const language = useLanguageSwitch();

  // La guarda de rutas solo deja llegar aquí con sesión.
  if (session.status !== 'authenticated') return null;

  return (
    <AppLayout
      sidebar={
        <AppSidebar
          brand={t('app.name')}
          navLabel={t('nav.main')}
          userName={session.user.name}
          signOutLabel={t('auth.signOut')}
          onSignOut={() => void logout()}
          languageSwitch={<LanguageSwitch {...language} />}
        >
          <SidebarLink to={ROUTES.dashboard} icon={<Icon name="grid" />}>
            {t('nav.dashboard')}
          </SidebarLink>
          <SidebarLink to={ROUTES.projects} icon={<Icon name="folder" />}>
            {t('nav.projects')}
          </SidebarLink>
        </AppSidebar>
      }
    >
      <Outlet />
    </AppLayout>
  );
}
