import {
  createGenerationRequestSchema,
  GENERATION_INPUT_LIMITS,
  GENERATION_TYPES,
  type CreateGenerationRequest,
} from '@devpilot/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { rejectedFields, type SubmitFailure } from '../../../features/forms/submitFailure';
import { fieldMessageKey } from '../../../i18n/messages';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { TextArea } from '../../atoms/TextArea/TextArea';
import { ChoiceGroup } from '../../molecules/ChoiceGroup/ChoiceGroup';
import { FormField } from '../../molecules/FormField/FormField';
import styles from './GenerationForm.module.css';

interface GenerationFormProps {
  /** A dónde lleva «Cancelar». */
  cancelTo: string;
  /** Lanza la generación. Si no puede, devuelve el motivo en vez de lanzar. */
  onSubmit: (values: CreateGenerationRequest) => Promise<SubmitFailure | undefined>;
  /** Traduce un fallo que no es de un campo concreto, como un límite de uso. */
  describeFailure: (failure: SubmitFailure) => string;
}

type FormValues = CreateGenerationRequest;

const FIELDS = ['type', 'inputText', 'additionalContext'] as const;

/**
 * Formulario de generación (RF-GEN-01): tipo, descripción en lenguaje natural y contexto
 * adicional opcional, con contadores. Valida con el mismo esquema que la API.
 */
export function GenerationForm({ cancelTo, onSubmit, describeFailure }: GenerationFormProps) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<SubmitFailure>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormValues>({
    // Se envía lo que escribió el usuario, no lo transformado: la API vuelve a validarlo.
    resolver: zodResolver(createGenerationRequestSchema, undefined, { raw: true }),
    defaultValues: { type: 'feature', inputText: '', additionalContext: '' },
  });
  const [type, inputText = '', additionalContext = ''] = useWatch({
    control,
    name: ['type', 'inputText', 'additionalContext'],
  });

  const counter = (current: number, max: number) => t('common.counter', { current, max });
  const reason = (message: string | undefined) => message && t(fieldMessageKey(message));

  const submit = handleSubmit(async (values) => {
    setFailure(undefined);
    const result = await onSubmit(values);
    if (!result) return;

    const rejected = rejectedFields(result, FIELDS);
    rejected.forEach(({ field, reason: message }, index) => {
      setError(field, { message }, { shouldFocus: index === 0 });
    });
    if (rejected.length === 0) setFailure(result);
  });

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      {failure && <Alert>{describeFailure(failure)}</Alert>}

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <ChoiceGroup
            legend={t('generation.form.type')}
            options={GENERATION_TYPES.map((value) => ({
              value,
              label: t(`history.type.${value}`),
            }))}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <FormField
        label={t('generation.form.inputText')}
        note={t('common.required')}
        counter={counter(inputText.length, GENERATION_INPUT_LIMITS.inputMax)}
        counterExceeded={inputText.length > GENERATION_INPUT_LIMITS.inputMax}
        error={reason(errors.inputText?.message)}
      >
        {(field) => (
          <TextArea
            rows={8}
            placeholder={t(`generation.form.placeholder.${type}`)}
            {...field}
            {...register('inputText')}
          />
        )}
      </FormField>

      <FormField
        label={t('generation.form.additionalContext')}
        counter={counter(additionalContext.length, GENERATION_INPUT_LIMITS.additionalContext)}
        counterExceeded={additionalContext.length > GENERATION_INPUT_LIMITS.additionalContext}
        hint={t('generation.form.additionalContextHint')}
        error={reason(errors.additionalContext?.message)}
      >
        {(field) => <TextArea rows={4} {...field} {...register('additionalContext')} />}
      </FormField>

      <div className={styles.actions}>
        <LinkButton to={cancelTo} variant="secondary">
          {t('common.cancel')}
        </LinkButton>
        {/* RF-GEN-04: deshabilitado mientras se envía, para no lanzar dos generaciones. */}
        <Button type="submit" disabled={isSubmitting}>
          <Icon name="sparkle" />
          {isSubmitting ? t('generation.form.submitting') : t('generation.form.submit')}
        </Button>
      </div>
    </form>
  );
}
