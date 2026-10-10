import { useTranslation } from 'react-i18next';
import { useServerStatus } from '../../../hooks/useServerStatus';
import { LANGUAGES } from '../../../i18n';
import { LanguageSwitch } from '../../molecules/LanguageSwitch/LanguageSwitch';
import { ServerStatusCard } from '../../organisms/ServerStatusCard/ServerStatusCard';
import { BrandLayout } from '../../templates/BrandLayout/BrandLayout';

/**
 * Página provisional del esqueleto: comprueba de punta a punta que el frontend llega a la
 * API y a la base de datos. El día 11 la sustituyen el login y el registro.
 */
export function HomePage() {
  const { t, i18n } = useTranslation();
  const server = useServerStatus();

  return (
    <BrandLayout
      brand={t('app.name')}
      tagline={t('app.tagline')}
      actions={
        <LanguageSwitch
          groupLabel={t('language.label')}
          languages={LANGUAGES}
          current={i18n.resolvedLanguage ?? i18n.language}
          onChange={(code) => void i18n.changeLanguage(code)}
        />
      }
    >
      <ServerStatusCard state={server.state} version={server.version} onRetry={server.retry} />
    </BrandLayout>
  );
}
