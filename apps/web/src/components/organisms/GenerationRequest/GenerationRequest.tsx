import type { GenerationDetail } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import styles from './GenerationRequest.module.css';

interface GenerationRequestProps {
  generation: GenerationDetail;
}

/** Lo que escribió el usuario: descripción, contexto y, si las hubo, sus respuestas a la IA. */
export function GenerationRequest({ generation }: GenerationRequestProps) {
  const { t } = useTranslation();
  const questions = generation.clarifyingQuestions ?? [];
  const answers = generation.clarificationAnswers;

  return (
    <aside className={styles.panel} aria-labelledby="generation-request">
      <h2 id="generation-request" className={styles.title}>
        {t('generation.request.title')}
      </h2>

      <div className={styles.block}>
        <h3 className={styles.heading}>{t('generation.request.description')}</h3>
        <p className={styles.text}>{generation.inputText}</p>
      </div>

      {generation.additionalContext && (
        <div className={styles.block}>
          <h3 className={styles.heading}>{t('generation.request.additionalContext')}</h3>
          <p className={styles.text}>{generation.additionalContext}</p>
        </div>
      )}

      {answers && questions.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.heading}>{t('generation.request.answers')}</h3>
          <dl className={styles.answers}>
            {questions.map((question) => {
              const answer = answers.find((item) => item.questionId === question.id)?.answer;
              return (
                <div key={question.id} className={styles.answer}>
                  <dt>{question.question}</dt>
                  <dd className={answer ? undefined : styles.missing}>
                    {answer || t('generation.request.noAnswer')}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </aside>
  );
}
