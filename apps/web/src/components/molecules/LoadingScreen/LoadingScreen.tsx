import { Spinner } from '../../atoms/Spinner/Spinner';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
  /** Qué se está esperando, ya traducido. */
  label: string;
}

/** Pantalla de espera a página completa, mientras se comprueba la sesión. */
export function LoadingScreen({ label }: LoadingScreenProps) {
  return (
    <div className={styles.screen} role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
