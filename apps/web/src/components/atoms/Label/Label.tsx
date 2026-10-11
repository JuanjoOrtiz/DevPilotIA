import type { LabelHTMLAttributes } from 'react';
import styles from './Label.module.css';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & { htmlFor: string };

/** Etiqueta de un campo. `htmlFor` es obligatorio: toda etiqueta va asociada a su campo. */
export function Label(props: LabelProps) {
  return <label className={styles.label} {...props} />;
}
