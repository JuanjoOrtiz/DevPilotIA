import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  /** Nombre de la aplicación, ya traducido. */
  brand: string;
  /** Presentación del producto, en el panel de color. */
  aside: ReactNode;
  /** Controles de la esquina, como el selector de idioma. */
  actions?: ReactNode;
  title: string;
  subtitle: string;
  /** Texto bajo el formulario, como el enlace a la otra página. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Esqueleto de login y registro: panel de marca y columna del formulario. Sin datos. */
export function AuthLayout({
  brand,
  aside,
  actions,
  title,
  subtitle,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <section className={styles.aside}>
        <div className={styles.brand}>
          <svg aria-hidden="true" width="32" height="32" viewBox="0 0 28 28">
            <rect width="28" height="28" rx="6" fill="var(--color-accent)" />
            <path d="M7 14.5 21 7l-5.5 14-2.6-5.9z" fill="#fff" />
          </svg>
          <span>{brand}</span>
        </div>
        <div className={styles.asideContent}>{aside}</div>
      </section>

      <main className={styles.main}>
        {actions && <div className={styles.actions}>{actions}</div>}
        <div className={styles.column}>
          <div className={styles.heading}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          {children}
          {footer && <p className={styles.footer}>{footer}</p>}
        </div>
      </main>
    </div>
  );
}
