import type { DashboardProject } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ChartCard } from '../../molecules/ChartCard/ChartCard';
import styles from './ProjectsChart.module.css';

interface ProjectsChartProps {
  projects: DashboardProject[];
  /** Ruta de cada proyecto, para ir a su historial desde la gráfica. */
  projectPath: (projectId: string) => string;
}

/**
 * RF-DAS-04: generaciones de los cinco proyectos con más actividad, en barras
 * horizontales. Son barras de HTML: los nombres largos se leen enteros y cada fila es un
 * enlace al proyecto, accesible con teclado y lector de pantalla (RNF-10).
 */
export function ProjectsChart({ projects, projectPath }: ProjectsChartProps) {
  const { t } = useTranslation();
  const max = Math.max(1, ...projects.map((project) => project.count));

  return (
    <ChartCard
      title={t('dashboard.projects.title')}
      description={t('dashboard.projects.description')}
    >
      <ol className={styles.bars}>
        {projects.map((project) => (
          <li key={project.projectId} className={styles.row}>
            <div className={styles.label}>
              <Link
                to={projectPath(project.projectId)}
                className={styles.name}
                aria-label={t('dashboard.projects.row', {
                  name: project.name,
                  count: project.count,
                })}
              >
                {project.name}
              </Link>
              <span className={styles.count} aria-hidden="true">
                {project.count}
              </span>
            </div>
            <div className={styles.track} aria-hidden="true">
              <div className={styles.bar} style={{ width: `${(project.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </ChartCard>
  );
}
