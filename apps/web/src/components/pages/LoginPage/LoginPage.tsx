import type { LoginRequest } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '../../../features/auth/routes';
import { useSession } from '../../../features/auth/SessionContext';
import { toSubmitFailure } from '../../../features/auth/submitFailure';
import { useLanguageSwitch } from '../../../hooks/useLanguageSwitch';
import { Alert } from '../../atoms/Alert/Alert';
import { LanguageSwitch } from '../../molecules/LanguageSwitch/LanguageSwitch';
import { LoginForm } from '../../organisms/LoginForm/LoginForm';
import { ProductPitch } from '../../organisms/ProductPitch/ProductPitch';
import { AuthLayout } from '../../templates/AuthLayout/AuthLayout';

const SECTIONS = ['technical', 'stories', 'tasks', 'risks', 'tests', 'complexity'] as const;

/** RF-AUT-02. Al entrar, la guarda de rutas lleva al usuario a donde quería ir. */
export function LoginPage() {
  const { t } = useTranslation();
  const { login, expired } = useSession();
  const language = useLanguageSwitch();

  const submit = (values: LoginRequest) => login(values).then(() => undefined, toSubmitFailure);

  return (
    <AuthLayout
      brand={t('app.name')}
      aside={
        <ProductPitch
          variant="boxed"
          eyebrow={t('auth.pitch.login.eyebrow')}
          title={t('auth.pitch.login.title')}
          description={t('auth.pitch.login.description')}
          items={SECTIONS.map((section) => ({
            title: t(`auth.pitch.login.sections.${section}`),
          }))}
        />
      }
      actions={<LanguageSwitch tone="onLight" {...language} />}
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link to={ROUTES.register}>{t('auth.login.createAccount')}</Link>
        </>
      }
    >
      {expired && <Alert>{t('auth.sessionExpired')}</Alert>}
      <LoginForm onSubmit={submit} />
    </AuthLayout>
  );
}
