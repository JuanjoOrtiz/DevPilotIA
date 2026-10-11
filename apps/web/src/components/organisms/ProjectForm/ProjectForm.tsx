import {
  createProjectRequestSchema,
  PROJECT_LIMITS,
  type CreateProjectRequest,
} from '@devpilot/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { rejectedFields, type SubmitFailure } from '../../../features/forms/submitFailure';
import { errorMessageKey, fieldMessageKey } from '../../../i18n/messages';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { TextArea } from '../../atoms/TextArea/TextArea';
import { TextInput } from '../../atoms/TextInput/TextInput';
import { FormField } from '../../molecules/FormField/FormField';
import { TagInput } from '../../molecules/TagInput/TagInput';
import styles from './ProjectForm.module.css';

interface ProjectFormProps {
  /** Valores con los que empieza el formulario: los del proyecto, al editar. */
  initialValues?: CreateProjectRequest;
  submitLabel: string;
  submittingLabel: string;
  /** A dónde lleva «Cancelar». */
  cancelTo: string;
  /** Guarda el proyecto. Si no puede, devuelve el motivo en vez de lanzar. */
  onSubmit: (values: CreateProjectRequest) => Promise<SubmitFailure | undefined>;
}

type FormValues = z.input<typeof createProjectRequestSchema>;

const FIELDS = ['name', 'description', 'techStack', 'conventions'] as const;
const EMPTY: CreateProjectRequest = { name: '', description: '', techStack: [], conventions: '' };

/** El motivo de error de una lista: el de la lista entera o el de su primer elemento erróneo. */
function listReason(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidates: unknown[] = Array.isArray(error)
    ? error
    : [error, 'root' in error ? error.root : undefined];

  for (const candidate of candidates) {
    if (typeof candidate === 'object' && candidate !== null && 'message' in candidate) {
      if (typeof candidate.message === 'string') return candidate.message;
    }
  }
  return undefined;
}

/**
 * Formulario de un proyecto, para crearlo y para editarlo (RF-PRO-01 y RF-PRO-04).
 * Valida con el mismo esquema que la API.
 */
export function ProjectForm({
  initialValues = EMPTY,
  submitLabel,
  submittingLabel,
  cancelTo,
  onSubmit,
}: ProjectFormProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<SubmitFailure>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, CreateProjectRequest>({
    resolver: zodResolver(createProjectRequestSchema),
    defaultValues: initialValues,
  });
  const [name = '', description = '', conventions = '', techStack = []] = useWatch({
    control,
    name: ['name', 'description', 'conventions', 'techStack'],
  });

  const counter = (current: number, max: number) => t('common.counter', { current, max });
  const reason = (message: string | undefined) => message && t(fieldMessageKey(message));
  const stackReason = listReason(errors.techStack);

  const submit = handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await onSubmit(values);
    if (!result) return;

    // Lo que la API rechaza de un campo concreto se muestra en ese campo; el resto, arriba.
    const rejected = rejectedFields(result, FIELDS);
    rejected.forEach(({ field, reason: message }, index) => {
      setError(field, { message }, { shouldFocus: index === 0 });
    });
    if (rejected.length === 0) setFailure(result);
  });

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      {failure && <Alert>{t(errorMessageKey(failure.code))}</Alert>}

      <FormField
        label={t('projectForm.fields.name')}
        note={t('common.required')}
        counter={counter(name.length, PROJECT_LIMITS.name)}
        counterExceeded={name.length > PROJECT_LIMITS.name}
        error={reason(errors.name?.message)}
      >
        {(field) => <TextInput autoComplete="off" {...field} {...register('name')} />}
      </FormField>

      <FormField
        label={t('projectForm.fields.description')}
        counter={counter(description.length, PROJECT_LIMITS.description)}
        counterExceeded={description.length > PROJECT_LIMITS.description}
        error={reason(errors.description?.message)}
      >
        {(field) => <TextArea rows={3} {...field} {...register('description')} />}
      </FormField>

      <FormField
        label={t('projectForm.fields.techStack')}
        counter={counter(techStack.length, PROJECT_LIMITS.tags)}
        counterExceeded={techStack.length > PROJECT_LIMITS.tags}
        hint={t('projectForm.fields.techStackHint')}
        error={reason(stackReason)}
      >
        {(field) => (
          <Controller
            control={control}
            name="techStack"
            render={({ field: { value = [], onChange, onBlur } }) => (
              <TagInput
                {...field}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={t('projectForm.fields.techStackPlaceholder')}
                removeLabel={(tag) => t('projectForm.fields.removeTag', { tag })}
                maxLength={PROJECT_LIMITS.tagLength}
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label={t('projectForm.fields.conventions')}
        counter={counter(conventions.length, PROJECT_LIMITS.conventions)}
        counterExceeded={conventions.length > PROJECT_LIMITS.conventions}
        hint={t('projectForm.fields.conventionsHint')}
        error={reason(errors.conventions?.message)}
      >
        {(field) => <TextArea rows={6} {...field} {...register('conventions')} />}
      </FormField>

      <div className={styles.actions}>
        <LinkButton to={cancelTo} variant="secondary">
          {t('common.cancel')}
        </LinkButton>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
