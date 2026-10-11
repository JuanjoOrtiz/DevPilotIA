import type { ReactNode } from 'react';
import styles from './FieldError.module.css';

interface FieldErrorProps {
  /** El campo lo referencia con `aria-describedby`. */
  id: string;
  children: ReactNode;
}

/** Mensaje de error de un campo. El icono es decorativo: el texto es el que informa. */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p id={id} className={styles.error}>
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.8v3.8M8 11.2v.1" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
