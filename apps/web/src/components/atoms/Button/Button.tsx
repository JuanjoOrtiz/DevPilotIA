import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `danger` confirma una acción destructiva; `dangerOutline` la ofrece. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa todo el ancho disponible, como el botón de enviar de un formulario. */
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  ...rest
}: ButtonProps) {
  const className = [
    styles.button,
    styles[variant],
    size === 'sm' ? styles.small : '',
    fullWidth ? styles.fullWidth : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={className} {...rest} />;
}
