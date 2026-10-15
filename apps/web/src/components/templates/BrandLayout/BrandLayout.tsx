import type { ReactNode } from 'react';
import styles from './BrandLayout.module.css';

interface BrandLayoutProps {
  /** Nombre de la aplicación, ya traducido. */
  brand: string;
  tagline: string;
  /** Controles de la cabecera, como el selector de idioma. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Esqueleto de las páginas sin sesión: cabecera de marca y contenido centrado. Sin datos. */
export function BrandLayout({ brand, tagline, actions, children }: BrandLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.bar}>
          <div className={styles.brand}>
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 28 28">
              <rect width="28" height="28" rx="4" fill="var(--color-accent)" />
              <path
                d="M8 9.5 12.5 14 8 18.5M15 19h5.5"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="square"
              />
            </svg>
            <span>{brand}</span>
          </div>
          {actions}
        </div>
        <h1 className={styles.tagline}>{tagline}</h1>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
