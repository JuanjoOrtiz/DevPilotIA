import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  /** Barra lateral, con la navegación y la cuenta. */
  sidebar: ReactNode;
  children: ReactNode;
}

/** Esqueleto de las páginas con sesión: barra lateral y contenido. Sin datos. */
export function AppLayout({ sidebar, children }: AppLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.sidebar}>{sidebar}</div>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
