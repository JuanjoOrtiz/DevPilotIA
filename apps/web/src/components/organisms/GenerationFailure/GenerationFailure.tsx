import { useTranslation } from 'react-i18next';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import styles from './GenerationFailure.module.css';

interface GenerationFailureProps {
  /** Por qué falló, ya traducido a partir de su código. */
  reason: string;
  /** Si el reintento tampoco se pudo lanzar (por ejemplo, por el límite diario). */
  retryError?: string | undefined;
  retrying: boolean;
  onRetry: () => void;
  backTo: string;
}

/**
 * Generación fallida (RF-GEN-05): un mensaje por código de error y un botón que reenvía la
 * misma entrada como una generación nueva.
 */
export function GenerationFailure({
  reason,
  retryError,
  retrying,
  onRetry,
  backTo,
}: GenerationFailureProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{t('generation.failed.title')}</h2>
      <p className={styles.reason}>{reason}</p>
      {retryError && <Alert>{retryError}</Alert>}
      <div className={styles.actions}>
        <LinkButton to={backTo} variant="secondary">
          {t('generation.failed.back')}
        </LinkButton>
        <Button onClick={onRetry} disabled={retrying}>
          {retrying ? t('generation.failed.retrying') : t('generation.failed.retry')}
        </Button>
      </div>
    </section>
  );
}
