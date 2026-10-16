import type { ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Tag.module.css';

interface TagProps {
  /** `outline` para un valor corto de una escala, como la complejidad. */
  variant?: 'filled' | 'outline';
  children: ReactNode;
  /** Si llega, la etiqueta lleva un botón para quitarla. */
  onRemove?: () => void;
  /** Nombre accesible de ese botón, ya traducido: «Quitar React». */
  removeLabel?: string;
}

/** Etiqueta corta en letra monoespaciada: una tecnología del stack o una talla.
 *  Lleva `translate="no"`: el traductor del navegador convertía la talla «M» en «METRO». */
export function Tag({ variant = 'filled', children, onRemove, removeLabel }: TagProps) {
  const className = [styles.tag, styles[variant], onRemove ? styles.removable : '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className} translate="no">
      {children}
      {onRemove && (
        <button type="button" className={styles.remove} aria-label={removeLabel} onClick={onRemove}>
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}
