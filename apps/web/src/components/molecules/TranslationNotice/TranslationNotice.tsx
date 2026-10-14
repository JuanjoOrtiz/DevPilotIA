import { Button } from '../../atoms/Button/Button';
import { Spinner } from '../../atoms/Spinner/Spinner';
import styles from './TranslationNotice.module.css';

type TranslationNoticeProps =
  | { state: 'translating'; message: string }
  | { state: 'failed'; message: string; retryLabel: string; onRetry: () => void };

/**
 * Aviso sobre la traducción de la especificación: mientras se traduce, o por qué no se ha
 * podido traducir. En los dos casos, debajo se ve la versión original.
 */
export function TranslationNotice(props: TranslationNoticeProps) {
  if (props.state === 'translating') {
    return (
      <p role="status" className={styles.notice}>
        <Spinner />
        {props.message}
      </p>
    );
  }
  return (
    <div role="alert" className={`${styles.notice} ${styles.failed}`}>
      <span className={styles.text}>{props.message}</span>
      <Button variant="secondary" size="sm" onClick={props.onRetry}>
        {props.retryLabel}
      </Button>
    </div>
  );
}
