import type { Ref, SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Marca el campo como erróneo, para la vista y para los lectores de pantalla. */
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

/** Lista desplegable nativa, con el aspecto de los demás campos. La etiqueta la pone quien la usa. */
export function Select({ invalid = false, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={invalid ? `${styles.select} ${styles.invalid}` : styles.select}
      {...rest}
    />
  );
}
