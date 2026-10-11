import { Link } from 'react-router';
import styles from './Breadcrumbs.module.css';

interface Crumb {
  label: string;
  /** Ruta interna. El último elemento, la página actual, no lleva enlace. */
  to?: string;
}

interface BreadcrumbsProps {
  /** Nombre accesible de la navegación, ya traducido. */
  label: string;
  items: readonly Crumb[];
}

/** Ruta de la página dentro de la aplicación: de dónde se viene y dónde se está. */
export function Breadcrumbs({ label, items }: BreadcrumbsProps) {
  return (
    <nav aria-label={label}>
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className={styles.item}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page" className={styles.current}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
