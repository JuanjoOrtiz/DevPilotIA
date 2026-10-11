import { useId } from 'react';
import { Icon } from '../../atoms/Icon/Icon';
import styles from './SearchField.module.css';

interface SearchFieldProps {
  /** Qué se busca, ya traducido. Es la etiqueta del campo, aunque no se vea, y su ejemplo. */
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Campo de búsqueda. La etiqueta no se ve, pero existe para los lectores de pantalla. */
export function SearchField({ label, value, onChange }: SearchFieldProps) {
  const id = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <span className={styles.icon}>
        <Icon name="search" />
      </span>
      <input
        id={id}
        type="search"
        className={styles.input}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
