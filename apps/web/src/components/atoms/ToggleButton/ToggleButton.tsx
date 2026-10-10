import type { ReactNode } from 'react';
import styles from './ToggleButton.module.css';

interface ToggleButtonProps {
  pressed: boolean;
  onClick: () => void;
  /** Idioma del texto del botón, si no es el de la página. */
  lang?: string;
  children: ReactNode;
}

/** Botón con dos estados. Varios juntos forman un selector, como el de idioma. */
export function ToggleButton({ pressed, onClick, lang, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      lang={lang}
      aria-pressed={pressed}
      className={pressed ? `${styles.toggle} ${styles.pressed}` : styles.toggle}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
