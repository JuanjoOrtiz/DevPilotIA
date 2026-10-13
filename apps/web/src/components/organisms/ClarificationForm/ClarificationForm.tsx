import {
  CLARIFICATION_LIMITS,
  type ClarificationAnswer,
  type ClarifyingQuestion,
} from '@devpilot/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { Icon } from '../../atoms/Icon/Icon';
import { TextArea } from '../../atoms/TextArea/TextArea';
import { FormField } from '../../molecules/FormField/FormField';
import styles from './ClarificationForm.module.css';

interface ClarificationFormProps {
  questions: ClarifyingQuestion[];
  /** Mientras se envía, los dos botones quedan deshabilitados. */
  busy: boolean;
  /** Por qué no se pudo enviar, ya traducido. */
  error?: string | undefined;
  onAnswer: (answers: ClarificationAnswer[]) => void;
  onSkip: () => void;
}

/**
 * Preguntas aclaratorias de la IA (RF-GEN-09). Cada una dice por qué se pregunta; las que
 * quedan en blanco se envían vacías y la IA las trata como supuestos (RF-GEN-10).
 */
export function ClarificationForm({
  questions,
  busy,
  error,
  onAnswer,
  onSkip,
}: ClarificationFormProps) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const tooLong = questions.some(
    (question) => (answers[question.id] ?? '').length > CLARIFICATION_LIMITS.answer,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (tooLong) return;
    onAnswer(
      questions.map((question) => ({
        questionId: question.id,
        answer: (answers[question.id] ?? '').trim(),
      })),
    );
  };

  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      <div className={styles.intro}>
        <h2 className={styles.title}>
          <Icon name="question" size={18} />
          {t('generation.clarification.title')}
        </h2>
        <p className={styles.description}>{t('generation.clarification.description')}</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <ol className={styles.questions}>
        {questions.map((question, index) => {
          const value = answers[question.id] ?? '';
          const exceeded = value.length > CLARIFICATION_LIMITS.answer;
          return (
            <li key={question.id} className={styles.question}>
              <p className={styles.text}>{question.question}</p>
              <p className={styles.why}>
                <span className={styles.whyLabel}>{t('generation.clarification.why')}:</span>{' '}
                {question.why}
              </p>
              <FormField
                label={t('generation.clarification.answer', { number: index + 1 })}
                counter={t('common.counter', {
                  current: value.length,
                  max: CLARIFICATION_LIMITS.answer,
                })}
                counterExceeded={exceeded}
                error={exceeded ? t('validation.ANSWER_TOO_LONG') : undefined}
              >
                {(field) => (
                  <TextArea
                    rows={2}
                    {...field}
                    value={value}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                    }
                  />
                )}
              </FormField>
            </li>
          );
        })}
      </ol>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" disabled={busy} onClick={onSkip}>
          {t('generation.clarification.skip')}
        </Button>
        <Button type="submit" disabled={busy || tooLong}>
          <Icon name="sparkle" />
          {busy ? t('generation.clarification.submitting') : t('generation.clarification.submit')}
        </Button>
      </div>
    </form>
  );
}
