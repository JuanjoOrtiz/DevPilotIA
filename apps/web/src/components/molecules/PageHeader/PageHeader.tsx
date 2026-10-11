import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Ruta de la página, encima del título. */
  breadcrumbs?: ReactNode;
  /** Acciones de la página, a la derecha del título: botones y enlaces. */
  actions?: ReactNode;
}

/** Cabecera de una página con sesión: dónde se está, el título y lo que se puede hacer. */
export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {breadcrumbs}
      <div className={styles.row}>
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
