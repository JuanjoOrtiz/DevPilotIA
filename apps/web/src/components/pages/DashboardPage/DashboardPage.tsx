import { useTranslation } from 'react-i18next';
import { useDashboardSummary } from '../../../features/dashboard/dashboardQueries';
import { useNumberFormat } from '../../../hooks/useNumberFormat';
import { queryErrorKey } from '../../../i18n/messages';
import { ROUTES } from '../../../routes';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { LoadingPanel } from '../../molecules/LoadingPanel/LoadingPanel';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { ActivityChart } from '../../organisms/ActivityChart/ActivityChart';
import { ComplexityChart } from '../../organisms/ComplexityChart/ComplexityChart';
import { DashboardStats } from '../../organisms/DashboardStats/DashboardStats';
import { ProjectsChart } from '../../organisms/ProjectsChart/ProjectsChart';
import { DashboardLayout } from '../../templates/DashboardLayout/DashboardLayout';

/**
 * RF-DAS-01 a 04: indicadores, actividad de los últimos 30 días, reparto por complejidad y
 * proyectos con más generaciones.
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const format = useNumberFormat();
  const summary = useDashboardSummary();

  function content() {
    if (summary.isPending) return <LoadingPanel label={t('dashboard.loading')} />;
    if (summary.isError) {
      return (
        <ErrorPanel
          message={t(queryErrorKey(summary.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void summary.refetch()}
        />
      );
    }
    if (summary.data.totals.generations === 0) {
      return (
        <EmptyState
          icon={<Icon name="grid" size={22} />}
          title={t('dashboard.empty.title')}
          description={t('dashboard.empty.description')}
          action={<LinkButton to={ROUTES.projects}>{t('dashboard.empty.action')}</LinkButton>}
        />
      );
    }
    return (
      <DashboardLayout
        stats={<DashboardStats totals={summary.data.totals} />}
        main={<ActivityChart activity={summary.data.activity} />}
      >
        <ComplexityChart complexity={summary.data.complexity} />
        <ProjectsChart projects={summary.data.projects} projectPath={ROUTES.project} />
      </DashboardLayout>
    );
  }

  const first = summary.data?.activity[0]?.date;
  const last = summary.data?.activity.at(-1)?.date;

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        {...(first &&
          last && {
            description: t('dashboard.period', {
              from: format.longDay(first),
              to: format.longDay(last),
            }),
          })}
      />
      {content()}
    </>
  );
}
