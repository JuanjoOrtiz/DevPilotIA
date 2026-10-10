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
              <rect width="28" height="28" rx="6" fill="var(--color-accent)" />
              <path d="M7 14.5 21 7l-5.5 14-2.6-5.9z" fill="#fff" />
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
