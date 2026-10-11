import type { ReactNode } from 'react';
import styles from './InfoPanel.module.css';

interface InfoPanelProps {
  title: string;
  /** Párrafos de la explicación. */
  children: ReactNode;
}

/** Explicación que acompaña a un formulario: qué se hace con lo que el usuario escribe. */
export function InfoPanel({ title, children }: InfoPanelProps) {
  return (
    <aside className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </aside>
  );
}
