import type { ReactNode } from 'react';
import styles from './ToggleButton.module.css';

interface ToggleButtonProps {
  pressed: boolean;
  onClick: () => void;
  /** Fondo sobre el que se pinta. */
  tone?: 'onNavy' | 'onLight';
  /** Idioma del texto del botón, si no es el de la página. */
  lang?: string;
  children: ReactNode;
}

/** Botón con dos estados. Varios juntos forman un selector, como el de idioma. */
export function ToggleButton({
  pressed,
  onClick,
  tone = 'onNavy',
  lang,
  children,
}: ToggleButtonProps) {
  const className = [styles.toggle, styles[tone], pressed ? styles.pressed : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      lang={lang}
      aria-pressed={pressed}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
