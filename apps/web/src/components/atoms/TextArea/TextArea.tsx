import type { Ref, TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Marca el campo como erróneo, para la vista y para los lectores de pantalla. */
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Campo de texto de varias líneas. La etiqueta y el mensaje de error los pone quien lo usa. */
export function TextArea({ invalid = false, rows = 3, ...rest }: TextAreaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={invalid ? `${styles.area} ${styles.invalid}` : styles.area}
      {...rest}
    />
  );
}
