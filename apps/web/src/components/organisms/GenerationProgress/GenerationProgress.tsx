import { useTranslation } from 'react-i18next';
import { Icon } from '../../atoms/Icon/Icon';
import { Spinner } from '../../atoms/Spinner/Spinner';
import styles from './GenerationProgress.module.css';

interface GenerationProgressProps {
  /** Segunda fase: la IA ya preguntó y genera con las respuestas. */
  withAnswers: boolean;
}

const STEPS = ['sent', 'generating', 'ready'] as const;
/** El frontend solo sabe que se está generando: el paso en curso siempre es el segundo. */
const CURRENT = 1;

/**
 * Estado «generando» (RF-GEN-04). No hay progreso real que mostrar: los pasos dicen en
 * qué punto está la petición y el texto, que se puede salir de la página.
 */
export function GenerationProgress({ withAnswers }: GenerationProgressProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.panel} role="status" aria-live="polite">
      <div className={styles.header}>
        <Spinner />
        <h2 className={styles.title}>
          {withAnswers ? t('generation.progress.titleAnswers') : t('generation.progress.title')}
        </h2>
      </div>
      <p className={styles.description}>{t('generation.progress.description')}</p>

      <ol className={styles.steps}>
        {STEPS.map((step, index) => {
          const state = index < CURRENT ? 'done' : index === CURRENT ? 'current' : 'pending';
          return (
            <li key={step} className={`${styles.step} ${styles[state]}`}>
              <span className={styles.marker} aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={12} /> : index + 1}
              </span>
              <span>{t(`generation.progress.steps.${step}`)}</span>
              {state !== 'pending' && (
                <span className={styles.hidden}>({t(`generation.progress.${state}`)})</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
