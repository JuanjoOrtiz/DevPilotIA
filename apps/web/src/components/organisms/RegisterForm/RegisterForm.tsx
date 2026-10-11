import { registerRequestSchema, type RegisterRequest } from '@devpilot/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { rejectedFields, type SubmitFailure } from '../../../features/forms/submitFailure';
import { errorMessageKey, fieldMessageKey } from '../../../i18n/messages';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { TextInput } from '../../atoms/TextInput/TextInput';
import { FormField } from '../../molecules/FormField/FormField';
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
    const rejected = rejectedFields(result, FIELDS);
    rejected.forEach(({ field, reason }, index) => {
      setError(field, { message: reason }, { shouldFocus: index === 0 });
    });
    if (rejected.length === 0) setFailure(result);
  });

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      {failure && <Alert>{t(errorMessageKey(failure.code))}</Alert>}

      <FormField
        label={t('auth.fields.name')}
        error={errors.name && t(fieldMessageKey(errors.name.message))}
      >
        {(control) => <TextInput autoComplete="name" {...control} {...register('name')} />}
      </FormField>
      <FormField
        label={t('auth.fields.email')}
        error={errors.email && t(fieldMessageKey(errors.email.message))}
      >
        {(control) => (
          <TextInput
            type="email"
            autoComplete="email"
            placeholder={t('auth.fields.emailPlaceholder')}
            {...control}
            {...register('email')}
          />
        )}
      </FormField>
      <FormField
        label={t('auth.fields.password')}
        hint={t('auth.fields.passwordHint')}
        error={errors.password && t(fieldMessageKey(errors.password.message))}
      >
        {(control) => (
          <TextInput
            type="password"
            autoComplete="new-password"
            {...control}
            {...register('password')}
          />
        )}
      </FormField>

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
      </Button>
    </form>
  );
}
