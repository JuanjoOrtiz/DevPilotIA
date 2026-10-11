import { registerRequestSchema, type RegisterRequest } from '@devpilot/shared';
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
import styles from './RegisterForm.module.css';

interface RegisterFormProps {
  /** Crea la cuenta. Si no puede, devuelve el motivo en vez de lanzar. */
  onSubmit: (values: RegisterRequest) => Promise<SubmitFailure | undefined>;
}

const FIELDS = ['name', 'email', 'password'] as const;

/** Formulario de registro (RF-AUT-01). Valida con el mismo esquema que la API. */
export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<SubmitFailure>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof registerRequestSchema>, unknown, RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
  });

  const submit = handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await onSubmit(values);
    if (!result) return;

    // Lo que la API rechaza de un campo concreto se muestra en ese campo; el resto, arriba.
    const rejected = FIELDS.filter((field) => result.fields[field]?.length);
    rejected.forEach((field, index) => {
      const message = result.fields[field]?.[0];
      if (message) setError(field, { message }, { shouldFocus: index === 0 });
    });
    if (rejected.length === 0) setFailure(result);
  });

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      {failure && <Alert>{t(errorMessageKey(failure.code))}</Alert>}

      <TextField
        label={t('auth.fields.name')}
        autoComplete="name"
        error={errors.name && t(fieldMessageKey(errors.name.message))}
        {...register('name')}
      />
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
        autoComplete="new-password"
        hint={t('auth.fields.passwordHint')}
        error={errors.password && t(fieldMessageKey(errors.password.message))}
        {...register('password')}
      />

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
      </Button>
    </form>
  );
}
