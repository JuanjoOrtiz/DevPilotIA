import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string;
  /** Una línea de contexto debajo del valor. */
  detail?: string;
}

/** Un indicador del dashboard: qué se mide, su valor y una línea de contexto. */
export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className={styles.card}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
      {detail && <dd className={styles.detail}>{detail}</dd>}
    </div>
  );
}
