import type { Project } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Tag } from '../../atoms/Tag/Tag';
import styles from './ProjectSummary.module.css';

interface ProjectSummaryProps {
  project: Project;
}

/** Los datos de un proyecto: el contexto que acompaña a cada generación (RF-PRO-03). */
export function ProjectSummary({ project }: ProjectSummaryProps) {
  const { t } = useTranslation();

  return (
    <section aria-label={t('project.summary.label')} className={styles.summary}>
      <div className={styles.column}>
        <div className={styles.block}>
          <h2 className={styles.heading}>{t('project.summary.description')}</h2>
          {project.description ? (
            <p className={styles.text}>{project.description}</p>
          ) : (
            <p className={styles.missing}>{t('project.summary.noDescription')}</p>
          )}
        </div>
        <div className={styles.block}>
          <h2 className={styles.heading}>{t('project.summary.stack')}</h2>
          {project.techStack.length > 0 ? (
            <ul className={styles.stack}>
              {project.techStack.map((technology) => (
                <li key={technology}>
                  <Tag>{technology}</Tag>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.missing}>{t('project.summary.noStack')}</p>
          )}
        </div>
      </div>

      <div className={styles.column}>
        <div className={styles.block}>
          <h2 className={styles.heading}>{t('project.summary.conventions')}</h2>
          {project.conventions ? (
            <p className={styles.conventions}>{project.conventions}</p>
          ) : (
            <p className={styles.missing}>{t('project.summary.noConventions')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
