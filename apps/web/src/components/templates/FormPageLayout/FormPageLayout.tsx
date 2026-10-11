import type { ReactNode } from 'react';
import styles from './FormPageLayout.module.css';

interface FormPageLayoutProps {
  /** El formulario. */
  children: ReactNode;
  /** Explicación que lo acompaña: al lado en pantallas anchas, debajo en las estrechas. */
  aside: ReactNode;
}

/** Esqueleto de una página de formulario: el formulario y, a su lado, su explicación. */
export function FormPageLayout({ children, aside }: FormPageLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.main}>{children}</div>
      <div className={styles.aside}>{aside}</div>
    </div>
  );
}
