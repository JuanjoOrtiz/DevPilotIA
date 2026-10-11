import { useRef, useState, type KeyboardEvent } from 'react';
import { Tag } from '../../atoms/Tag/Tag';
import styles from './TagInput.module.css';

interface TagInputProps {
  id: string;
  invalid?: boolean;
  'aria-describedby'?: string | undefined;
  value: readonly string[];
  onChange: (tags: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Nombre accesible del botón que quita una etiqueta, ya traducido. */
  removeLabel: (tag: string) => string;
  /** Longitud máxima de una etiqueta. */
  maxLength?: number;
}

/**
 * Lista de etiquetas que se escribe con el teclado: Intro o coma añaden la etiqueta y
 * Retroceso, con la entrada vacía, quita la última. No admite repetidas.
 */
export function TagInput({
  id,
  invalid = false,
  'aria-describedby': describedBy,
  value,
  onChange,
  onBlur,
  placeholder,
  removeLabel,
  maxLength,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);

  function addDraft(): void {
    const tag = draft.trim();
    setDraft('');
    if (tag === '') return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  function remove(tag: string): void {
    onChange(value.filter((existing) => existing !== tag));
    // El botón pulsado desaparece: el foco vuelve a la entrada en vez de perderse.
    input.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === ',') {
      // Intro añade la etiqueta; nunca envía el formulario desde aquí.
      event.preventDefault();
      addDraft();
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={invalid ? `${styles.box} ${styles.invalid}` : styles.box}>
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => remove(tag)} removeLabel={removeLabel(tag)}>
          {tag}
        </Tag>
      ))}
      <input
        ref={input}
        id={id}
        type="text"
        className={styles.input}
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Lo que quedó escrito sin pulsar Intro también cuenta.
          addDraft();
          onBlur?.();
        }}
      />
    </div>
  );
}
