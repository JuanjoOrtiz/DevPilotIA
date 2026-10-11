import type { RegisterRequest } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '../../../features/auth/routes';
import { useSession } from '../../../features/auth/SessionContext';
import { toSubmitFailure } from '../../../features/auth/submitFailure';
import { useLanguageSwitch } from '../../../hooks/useLanguageSwitch';
import { LanguageSwitch } from '../../molecules/LanguageSwitch/LanguageSwitch';
import { ProductPitch } from '../../organisms/ProductPitch/ProductPitch';
import { RegisterForm } from '../../organisms/RegisterForm/RegisterForm';
import { AuthLayout } from '../../templates/AuthLayout/AuthLayout';

const STEPS = ['project', 'describe', 'export'] as const;

/** RF-AUT-01. Al registrarse, la sesión queda iniciada y la guarda de rutas lleva dentro. */
export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useSession();
  const language = useLanguageSwitch();

  const submit = (values: RegisterRequest) =>
    register(values).then(() => undefined, toSubmitFailure);

  return (
    <AuthLayout
      brand={t('app.name')}
      aside={
        <ProductPitch
          eyebrow={t('auth.pitch.register.eyebrow')}
          title={t('auth.pitch.register.title')}
          items={STEPS.map((step) => ({
            title: t(`auth.pitch.register.steps.${step}.title`),
            description: t(`auth.pitch.register.steps.${step}.description`),
          }))}
        />
      }
      actions={<LanguageSwitch tone="onLight" {...language} />}
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.haveAccount')}{' '}
          <Link to={ROUTES.login}>{t('auth.register.signIn')}</Link>
        </>
      }
    >
      <RegisterForm onSubmit={submit} />
    </AuthLayout>
  );
}
