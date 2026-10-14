import { DASHBOARD_PERIODS, type DashboardPeriod } from '@devpilot/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '../../atoms/Label/Label';
import { Select } from '../../atoms/Select/Select';
import styles from './DashboardFilters.module.css';

interface DashboardFiltersProps {
  days: DashboardPeriod;
  projectId: string | undefined;
  projects: readonly { id: string; name: string }[];
  onChange: (filter: { days: DashboardPeriod; projectId: string | undefined }) => void;
}

/** RF-DAS-06: el periodo y el proyecto del dashboard. */
export function DashboardFilters({ days, projectId, projects, onChange }: DashboardFiltersProps) {
  const { t } = useTranslation();
  const periodId = useId();
  const projectFieldId = useId();

  return (
    <div className={styles.filters}>
      <div className={styles.field}>
        <Label htmlFor={periodId}>{t('dashboard.filters.period')}</Label>
        <Select
          id={periodId}
          value={days}
          onChange={(event) =>
            onChange({ days: Number(event.target.value) as DashboardPeriod, projectId })
          }
        >
          {DASHBOARD_PERIODS.map((period) => (
            <option key={period} value={period}>
              {t('dashboard.filters.days', { count: period })}
            </option>
          ))}
        </Select>
      </div>
      <div className={styles.field}>
        <Label htmlFor={projectFieldId}>{t('dashboard.filters.project')}</Label>
        <Select
          id={projectFieldId}
          value={projectId ?? ''}
          onChange={(event) => onChange({ days, projectId: event.target.value || undefined })}
        >
          <option value="">{t('dashboard.filters.allProjects')}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
