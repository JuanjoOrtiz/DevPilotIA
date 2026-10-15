import type { ReactNode } from 'react';
import styles from './AppSidebar.module.css';

interface AppSidebarProps {
  /** Nombre de la aplicación, ya traducido. */
  brand: string;
  /** Nombre accesible de la navegación, ya traducido. */
  navLabel: string;
  userName: string;
  signOutLabel: string;
  onSignOut: () => void;
  /** Selector de idioma. */
  languageSwitch: ReactNode;
  /** Enlaces de navegación. */
  children?: ReactNode;
}

/** Barra lateral de la aplicación con sesión: marca, navegación y cuenta. No pide datos. */
export function AppSidebar({
  brand,
  navLabel,
  userName,
  signOutLabel,
  onSignOut,
  languageSwitch,
  children,
}: AppSidebarProps) {
  return (
    <nav aria-label={navLabel} className={styles.sidebar}>
      <div className={styles.brand}>
        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28">
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

      {children && <div className={styles.links}>{children}</div>}

      <div className={styles.account}>
        <div className={styles.user}>
          <span className={styles.userName}>{userName}</span>
          <button type="button" className={styles.signOut} onClick={onSignOut}>
            {signOutLabel}
          </button>
        </div>
        {languageSwitch}
      </div>
    </nav>
  );
}
