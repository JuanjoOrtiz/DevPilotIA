import type { ReactNode } from 'react';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  /** Indicadores, arriba y a todo el ancho. */
  stats: ReactNode;
  /** Gráfica principal, a todo el ancho. */
  main: ReactNode;
  /** Gráficas secundarias, en columnas que se apilan en pantallas estrechas. */
  children?: ReactNode;
}

/** Esqueleto del dashboard: indicadores, la gráfica de actividad y una rejilla de gráficas. */
export function DashboardLayout({ stats, main, children }: DashboardLayoutProps) {
  return (
    <div className={styles.layout}>
      {stats}
      {main}
      {children && <div className={styles.grid}>{children}</div>}
    </div>
  );
}
