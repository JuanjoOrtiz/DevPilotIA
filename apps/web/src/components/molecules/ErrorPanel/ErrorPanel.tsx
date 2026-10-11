import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import styles from './ErrorPanel.module.css';

interface ErrorPanelProps {
  /** Qué ha fallado, ya traducido. */
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

/** Estado de error de una parte de la página, con la forma de volver a intentarlo (RNF-09). */
export function ErrorPanel({ message, retryLabel, onRetry }: ErrorPanelProps) {
  return (
    <div className={styles.panel}>
      <Alert>{message}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
