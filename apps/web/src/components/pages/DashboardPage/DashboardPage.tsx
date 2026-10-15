import { DASHBOARD_ACTIVITY_DAYS, DASHBOARD_PERIODS, type DashboardPeriod } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useDashboardSummary } from '../../../features/dashboard/dashboardQueries';
import { useProjects } from '../../../features/projects/projectQueries';
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
import { DashboardFilters } from '../../organisms/DashboardFilters/DashboardFilters';
import { DashboardStats } from '../../organisms/DashboardStats/DashboardStats';
import { ProjectsChart } from '../../organisms/ProjectsChart/ProjectsChart';
import { DashboardLayout } from '../../templates/DashboardLayout/DashboardLayout';

/**
 * RF-DAS-01 a 04 y 06: indicadores, actividad de los últimos 30 días, reparto por complejidad y
 * proyectos con más generaciones.
 */
/** El periodo que pide la dirección; si no es uno de los ofrecidos, el de por defecto. */
function requestedPeriod(value: string | null): DashboardPeriod {
  const days = Number(value);
  return (DASHBOARD_PERIODS as readonly number[]).includes(days)
    ? (days as DashboardPeriod)
    : DASHBOARD_ACTIVITY_DAYS;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const format = useNumberFormat();
  // El filtro va en la dirección (`?days=7&project=…`): se puede recargar y compartir.
  const [searchParams, setSearchParams] = useSearchParams();
  const days = requestedPeriod(searchParams.get('days'));
  const projectId = searchParams.get('project') ?? undefined;
  const summary = useDashboardSummary({ days, ...(projectId && { projectId }) });
  const projects = useProjects();
  const filtered = days !== DASHBOARD_ACTIVITY_DAYS || projectId !== undefined;

  function changeFilter(filter: { days: DashboardPeriod; projectId: string | undefined }) {
    const next = new URLSearchParams();
    if (filter.days !== DASHBOARD_ACTIVITY_DAYS) next.set('days', String(filter.days));
    if (filter.projectId) next.set('project', filter.projectId);
    setSearchParams(next, { replace: true });
  }

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
    if (summary.data.totals.generations === 0 && filtered) {
      return (
        <EmptyState
          icon={<Icon name="grid" size={22} />}
          title={t('dashboard.emptyFiltered.title')}
          description={t('dashboard.emptyFiltered.description')}
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
        actions={
          <DashboardFilters
            days={days}
            projectId={projectId}
            projects={projects.data ?? []}
            onChange={changeFilter}
          />
        }
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
