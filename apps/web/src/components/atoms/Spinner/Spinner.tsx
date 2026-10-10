import styles from './Spinner.module.css';

/** Indicador de espera. Es decorativo: el texto que lo acompaña es el que informa. */
export function Spinner() {
  return (
    <svg
      className={styles.spinner}
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M6 1.5a4.5 4.5 0 1 0 4.5 4.5" />
    </svg>
  );
}
