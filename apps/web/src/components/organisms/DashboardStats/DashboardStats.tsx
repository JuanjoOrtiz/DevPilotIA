import type { DashboardTotals } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../hooks/useNumberFormat';
import { StatCard } from '../../molecules/StatCard/StatCard';
import styles from './DashboardStats.module.css';

interface DashboardStatsProps {
  totals: DashboardTotals;
}

/** RF-DAS-01: proyectos, generaciones, porcentaje de completadas y tiempo medio. */
export function DashboardStats({ totals }: DashboardStatsProps) {
  const { t } = useTranslation();
  const format = useNumberFormat();
  const noValue = t('dashboard.stats.noValue');

  return (
    <section aria-label={t('dashboard.stats.label')}>
      <dl className={styles.grid}>
        <StatCard
          label={t('dashboard.stats.projects')}
          value={String(totals.projects)}
          detail={t('dashboard.stats.projectsDetail')}
        />
        <StatCard
          label={t('dashboard.stats.generations')}
          value={String(totals.generations)}
          detail={`${t('dashboard.stats.features', { count: totals.features })} · ${t('dashboard.stats.bugs', { count: totals.bugs })}`}
        />
        <StatCard
          label={t('dashboard.stats.completed')}
          value={totals.completionRate === null ? noValue : format.percent(totals.completionRate)}
          detail={t('dashboard.stats.completedDetail', {
            completed: totals.completed,
            total: totals.generations,
            count: totals.failed,
          })}
        />
        <StatCard
          label={t('dashboard.stats.averageTime')}
          value={
            totals.averageDurationMs === null ? noValue : format.seconds(totals.averageDurationMs)
          }
          detail={t('dashboard.stats.averageTimeDetail')}
        />
      </dl>
    </section>
  );
}
