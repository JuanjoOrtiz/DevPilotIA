import type { GenerationPageResponse, GenerationSummary } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { Icon, type IconName } from '../../atoms/Icon/Icon';
import { StatusBadge, type StatusTone } from '../../atoms/StatusBadge/StatusBadge';
import { Tag } from '../../atoms/Tag/Tag';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { LoadingPanel } from '../../molecules/LoadingPanel/LoadingPanel';
import { Pagination } from '../../molecules/Pagination/Pagination';
import styles from './GenerationHistory.module.css';

interface GenerationHistoryProps {
  /** La página que se muestra. Sin ella, se está cargando o ha fallado. */
  page: GenerationPageResponse | undefined;
  /** Por qué no se pudo cargar, ya traducido. */
  error?: string | undefined;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

const COLUMNS = ['title', 'type', 'complexity', 'status', 'date'] as const;

const STATUS: Record<GenerationSummary['status'], { tone: StatusTone; icon: IconName }> = {
  generating: { tone: 'info', icon: 'progress' },
  completed: { tone: 'success', icon: 'check' },
  failed: { tone: 'danger', icon: 'alert' },
};

/**
 * Historial de generaciones de un proyecto, de más reciente a más antigua (RF-HIS-01).
 * No pide datos: recibe la página y avisa cuando el usuario quiere otra.
 */
export function GenerationHistory({ page, error, onRetry, onPageChange }: GenerationHistoryProps) {
  const { t } = useTranslation();
  const format = useDateFormat();

  function content() {
    if (error) {
      return <ErrorPanel message={error} retryLabel={t('common.retry')} onRetry={onRetry} />;
    }
    if (!page) return <LoadingPanel label={t('history.loading')} />;
    if (page.total === 0) {
      return (
        <EmptyState title={t('history.empty.title')} description={t('history.empty.description')} />
      );
    }

    const first = (page.page - 1) * page.pageSize + 1;
    const lastPage = Math.ceil(page.total / page.pageSize);

    return (
      <>
        {page.items.length > 0 && (
          <div className={styles.frame}>
            {/* Los roles van escritos porque, cuando falta ancho, las filas se pintan como
                tarjetas, y un navegador deja de tratar como tabla lo que no se pinta como tal. */}
            <table role="table" className={styles.table}>
              <thead role="rowgroup">
                <tr role="row">
                  {COLUMNS.map((column) => (
                    <th key={column} role="columnheader" scope="col">
                      {t(`history.columns.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody role="rowgroup">
                {page.items.map((generation) => (
                  <tr key={generation.id} role="row">
                    <th role="rowheader" scope="row" className={styles.title}>
                      {generation.title ?? generation.inputExcerpt}
                    </th>
                    <td role="cell">
                      <StatusBadge tone={generation.type === 'bug' ? 'caution' : 'info'}>
                        {t(`history.type.${generation.type}`)}
                      </StatusBadge>
                    </td>
                    <td role="cell">
                      {generation.complexity ? (
                        <Tag variant="outline">{generation.complexity}</Tag>
                      ) : (
                        <span className={styles.none} title={t('history.noComplexity')}>
                          <span aria-hidden="true" className={styles.dash}>
                            —
                          </span>
                          <span className={styles.hidden}>{t('history.noComplexity')}</span>
                        </span>
                      )}
                    </td>
                    <td role="cell">
                      <span className={styles.badges}>
                        <StatusBadge
                          tone={STATUS[generation.status].tone}
                          icon={<Icon name={STATUS[generation.status].icon} size={12} />}
                        >
                          {t(`history.status.${generation.status}`)}
                        </StatusBadge>
                        {generation.isEdited && (
                          <StatusBadge tone="neutral">{t('history.edited')}</StatusBadge>
                        )}
                        {generation.isSample && (
                          <StatusBadge tone="neutral">{t('history.sample')}</StatusBadge>
                        )}
                      </span>
                    </td>
                    <td role="cell" className={styles.date}>
                      {format.dateTime(generation.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          label={t('history.pagination')}
          summary={
            page.items.length > 0
              ? t('history.range', {
                  from: first,
                  to: first + page.items.length - 1,
                  count: page.total,
                })
              : t('history.outOfRange')
          }
          previousLabel={t('common.previous')}
          nextLabel={t('common.next')}
          onPrevious={
            page.page > 1 ? () => onPageChange(Math.min(page.page - 1, lastPage)) : undefined
          }
          onNext={page.page < lastPage ? () => onPageChange(page.page + 1) : undefined}
        />
      </>
    );
  }

  return (
    <section className={styles.history}>
      <h2 className={styles.heading}>{t('history.title')}</h2>
      {content()}
    </section>
  );
}
