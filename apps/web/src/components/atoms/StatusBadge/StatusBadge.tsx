import type { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

/** Etiqueta de estado. El texto siempre acompaña al color: el color nunca es el único aviso. */
export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
