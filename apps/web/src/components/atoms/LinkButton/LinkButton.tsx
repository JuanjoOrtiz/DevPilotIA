import type { ReactNode } from 'react';
import { Link } from 'react-router';
import buttonStyles from '../Button/Button.module.css';
import styles from './LinkButton.module.css';

interface LinkButtonProps {
  /** Ruta interna de la aplicación. */
  to: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

/**
 * Un enlace con el aspecto de `Button`: lleva a otra página, así que es un enlace y no
 * un botón. Reutiliza sus estilos para que los dos se vean siempre igual.
 */
export function LinkButton({ to, variant = 'primary', children }: LinkButtonProps) {
  return (
    <Link to={to} className={`${buttonStyles.button} ${buttonStyles[variant]} ${styles[variant]}`}>
      {children}
    </Link>
  );
}
