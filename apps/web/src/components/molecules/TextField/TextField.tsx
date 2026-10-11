import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { FieldError } from '../../atoms/FieldError/FieldError';
import { Label } from '../../atoms/Label/Label';
import { TextInput } from '../../atoms/TextInput/TextInput';
import styles from './TextField.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Mensaje de error ya traducido. Si llega, el campo se marca como erróneo. */
  error?: string | undefined;
  /** Ayuda breve bajo el campo, ya traducida. */
  hint?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

/** Campo de formulario: etiqueta, entrada y su error, ya enlazados para accesibilidad (RNF-10). */
export function TextField({ label, error, hint, ...input }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <TextInput id={id} invalid={Boolean(error)} aria-describedby={describedBy} {...input} />
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
