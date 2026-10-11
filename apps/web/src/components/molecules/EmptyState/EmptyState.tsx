import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  /** Icono decorativo. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Qué puede hacer el usuario a continuación: un botón o un enlace. */
  action?: ReactNode;
}

/** Lo que se muestra en lugar de una lista cuando no hay nada que listar (RNF-09). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  );
}
