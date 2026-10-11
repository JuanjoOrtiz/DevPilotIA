import { useId, type ReactNode } from 'react';
import { FieldError } from '../../atoms/FieldError/FieldError';
import { Label } from '../../atoms/Label/Label';
import styles from './FormField.module.css';

/** Lo que el control necesita para quedar enlazado con su etiqueta, su ayuda y su error. */
export interface FieldControlProps {
  id: string;
  invalid: boolean;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  label: string;
  /** Nota junto a la etiqueta, ya traducida: «(obligatorio)». */
  note?: string | undefined;
  /** Contador junto a la etiqueta, ya formateado: «18 / 80». */
  counter?: string | undefined;
  /** El contador ha superado el máximo. */
  counterExceeded?: boolean;
  /** Ayuda breve bajo el campo, ya traducida. */
  hint?: string | undefined;
  /** Mensaje de error ya traducido. Si llega, el campo se marca como erróneo. */
  error?: string | undefined;
  /** El control del campo. Recibe las propiedades que lo enlazan con el resto. */
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Campo de formulario: etiqueta, control, ayuda y error, enlazados para accesibilidad
 * (RNF-10). Sirve para cualquier control: una entrada, un área de texto o unas etiquetas.
 */
export function FormField({
  label,
  note,
  counter,
  counterExceeded = false,
  hint,
  error,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={styles.field}>
      <div className={styles.heading}>
        <Label htmlFor={id}>
          {label}
          {note && <span className={styles.note}> {note}</span>}
        </Label>
        {counter && (
          <span
            className={counterExceeded ? `${styles.counter} ${styles.exceeded}` : styles.counter}
          >
            {counter}
          </span>
        )}
      </div>

      {children({
        id,
        invalid: Boolean(error),
        'aria-describedby': error ? errorId : hint ? hintId : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
