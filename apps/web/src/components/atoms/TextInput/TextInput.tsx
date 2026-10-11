import type { InputHTMLAttributes, Ref } from 'react';
import styles from './TextInput.module.css';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marca el campo como erróneo, para la vista y para los lectores de pantalla. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Campo de texto de una línea. La etiqueta y el mensaje de error los pone quien lo usa. */
export function TextInput({ invalid = false, type = 'text', ...rest }: TextInputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={invalid ? `${styles.input} ${styles.invalid}` : styles.input}
      {...rest}
    />
  );
}
