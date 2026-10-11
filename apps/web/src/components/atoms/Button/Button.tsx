import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  /** Ocupa todo el ancho disponible, como el botón de enviar de un formulario. */
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  type = 'button',
  fullWidth = false,
  ...rest
}: ButtonProps) {
  const className = [styles.button, styles[variant], fullWidth ? styles.fullWidth : '']
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={className} {...rest} />;
}
