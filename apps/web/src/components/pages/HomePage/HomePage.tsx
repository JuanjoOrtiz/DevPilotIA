import { useTranslation } from 'react-i18next';
import { useSession } from '../../../features/auth/SessionContext';
import { useLanguageSwitch } from '../../../hooks/useLanguageSwitch';
import { useServerStatus } from '../../../hooks/useServerStatus';
import { LanguageSwitch } from '../../molecules/LanguageSwitch/LanguageSwitch';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { AppSidebar } from '../../organisms/AppSidebar/AppSidebar';
import { ServerStatusCard } from '../../organisms/ServerStatusCard/ServerStatusCard';
import { AppLayout } from '../../templates/AppLayout/AppLayout';

/**
 * Primera página con sesión. De momento saluda y muestra el estado del servidor; el día 12
 * la sustituyen los proyectos.
 */
export function HomePage() {
  const { t } = useTranslation();
  const { session, logout } = useSession();
  const language = useLanguageSwitch();
  const server = useServerStatus();

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
        />
      }
    >
      <PageHeader
        title={t('home.greeting', { name: session.user.name })}
        description={t('home.intro')}
      />
      <ServerStatusCard state={server.state} version={server.version} onRetry={server.retry} />
    </AppLayout>
  );
}
