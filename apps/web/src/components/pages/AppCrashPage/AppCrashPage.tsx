import { useTranslation } from 'react-i18next';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { BrandLayout } from '../../templates/BrandLayout/BrandLayout';

/**
 * Lo que se ve si la interfaz falla sin remedio (RNF-15): el error ya ha ido a Sentry y
 * recargar es lo único que se puede hacer.
 */
export function AppCrashPage() {
  const { t } = useTranslation();
  return (
    <BrandLayout brand={t('app.name')} tagline={t('app.tagline')}>
      <ErrorPanel
        message={t('app.crashed')}
        retryLabel={t('app.reload')}
        onRetry={() => window.location.reload()}
      />
    </BrandLayout>
  );
}
