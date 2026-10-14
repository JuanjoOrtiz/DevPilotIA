import type { ReactNode } from 'react';
import styles from './ChartCard.module.css';

interface ChartCardProps {
  title: string;
  description?: string;
  /** Texto que describe la gráfica para quien no la ve: su resumen en una frase. */
  summary: string;
  /** La gráfica. Es decorativa para los lectores de pantalla, que leen `summary`. */
  children: ReactNode;
}

/** Tarjeta de una gráfica del dashboard, con su título y una descripción accesible. */
export function ChartCard({ title, description, summary, children }: ChartCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div role="img" aria-label={summary} className={styles.chart}>
        {children}
      </div>
    </section>
  );
}
