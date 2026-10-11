import styles from './ProductPitch.module.css';

interface PitchItem {
  title: string;
  description?: string;
}

interface ProductPitchProps {
  eyebrow: string;
  title: string;
  description?: string;
  items: readonly PitchItem[];
  /** `boxed` enmarca la lista, como en el login; `plain` la deja abierta, como en el registro. */
  variant?: 'boxed' | 'plain';
}

/** Presentación del producto en las páginas sin sesión. Recibe los textos ya traducidos. */
export function ProductPitch({
  eyebrow,
  title,
  description,
  items,
  variant = 'plain',
}: ProductPitchProps) {
  return (
    <div className={styles.pitch}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>

      <ol className={`${styles.list} ${styles[variant]}`}>
        {items.map((item, index) => (
          <li key={item.title} className={styles.item}>
            <span className={styles.number} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={styles.text}>
              <span className={styles.itemTitle}>{item.title}</span>
              {item.description && (
                <span className={styles.itemDescription}>{item.description}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
