import type { Project } from '@devpilot/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { ROUTES } from '../../../routes';
import { Tag } from '../../atoms/Tag/Tag';
import { SearchField } from '../../molecules/SearchField/SearchField';
import styles from './ProjectBrowser.module.css';

interface ProjectBrowserProps {
  /** Los proyectos del usuario, ya ordenados. Al menos uno: el estado vacío va aparte. */
  projects: readonly Project[];
}

/** Para comparar nombres sin que importen las mayúsculas ni las tildes. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Lista de proyectos con búsqueda por nombre (RF-PRO-02). No pide datos: los recibe. */
export function ProjectBrowser({ projects }: ProjectBrowserProps) {
  const { t } = useTranslation();
  const format = useDateFormat();
  const [query, setQuery] = useState('');

  const wanted = fold(query.trim());
  const visible = projects.filter((project) => fold(project.name).includes(wanted));

  return (
    <>
      <div className={styles.toolbar}>
        <SearchField label={t('projects.search')} value={query} onChange={setQuery} />
        <span className={styles.count} role="status">
          {t('projects.count', { count: visible.length })}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className={styles.noResults}>{t('projects.noResults', { query: query.trim() })}</p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((project) => (
            <li key={project.id} className={styles.card}>
              <div className={styles.heading}>
                <h2 className={styles.name}>
                  <Link to={ROUTES.project(project.id)}>{project.name}</Link>
                </h2>
                {project.description && <p className={styles.description}>{project.description}</p>}
              </div>

              {project.techStack.length > 0 && (
                <ul aria-label={t('projects.card.stack')} className={styles.stack}>
                  {project.techStack.map((technology) => (
                    <li key={technology}>
                      <Tag>{technology}</Tag>
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.footer}>
                <span>
                  <strong>{project.generationCount}</strong>{' '}
                  {t('projects.card.generations', { count: project.generationCount })}
                </span>
                <span>
                  {t('projects.card.lastActivity', { date: format.date(project.lastActivityAt) })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
