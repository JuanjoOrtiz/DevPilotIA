import { loginRequestSchema, type LoginRequest } from '@devpilot/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { SubmitFailure } from '../../../features/auth/submitFailure';
import { errorMessageKey, fieldMessageKey } from '../../../i18n/messages';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { TextField } from '../../molecules/TextField/TextField';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  /** Inicia la sesión. Si no puede, devuelve el motivo en vez de lanzar. */
  onSubmit: (values: LoginRequest) => Promise<SubmitFailure | undefined>;
}

/** Formulario de inicio de sesión. Valida con el mismo esquema que la API. */
export function LoginForm({ onSubmit }: LoginFormProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<SubmitFailure>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof loginRequestSchema>, unknown, LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
  });

  const submit = handleSubmit(async (values) => {
    setFailure(undefined);
    setFailure(await onSubmit(values));
  });

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      {failure && <Alert>{t(errorMessageKey(failure.code))}</Alert>}

      <TextField
        label={t('auth.fields.email')}
        type="email"
        autoComplete="email"
        placeholder={t('auth.fields.emailPlaceholder')}
        error={errors.email && t(fieldMessageKey(errors.email.message))}
        {...register('email')}
      />
      <TextField
        label={t('auth.fields.password')}
        type="password"
        autoComplete="current-password"
        error={errors.password && t(fieldMessageKey(errors.password.message))}
        {...register('password')}
      />

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
      </Button>
    </form>
  );
}
