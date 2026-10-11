import { Spinner } from '../../atoms/Spinner/Spinner';
import styles from './LoadingPanel.module.css';

interface LoadingPanelProps {
  /** Qué se está cargando, ya traducido. */
  label: string;
}

/** Estado de carga de una parte de la página (RNF-09). Los lectores de pantalla lo anuncian. */
export function LoadingPanel({ label }: LoadingPanelProps) {
  return (
    <div className={styles.panel} role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
