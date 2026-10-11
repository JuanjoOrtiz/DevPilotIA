import { Button } from '../../atoms/Button/Button';
import styles from './Pagination.module.css';

interface PaginationProps {
  /** Nombre accesible de la navegación, ya traducido. */
  label: string;
  /** Qué se está viendo, ya traducido: «1–10 de 23 generaciones». */
  summary: string;
  previousLabel: string;
  nextLabel: string;
  /** Sin manejador no hay página a la que ir y el botón queda deshabilitado. */
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}

/** Paso entre las páginas de una lista larga, con el resumen de lo que se ve. */
export function Pagination({
  label,
  summary,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: PaginationProps) {
  return (
    <nav aria-label={label} className={styles.pagination}>
      <span className={styles.summary} aria-live="polite">
        {summary}
      </span>
      <div className={styles.buttons}>
        <Button variant="secondary" size="sm" disabled={!onPrevious} onClick={onPrevious}>
          {previousLabel}
        </Button>
        <Button variant="secondary" size="sm" disabled={!onNext} onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    </nav>
  );
}
