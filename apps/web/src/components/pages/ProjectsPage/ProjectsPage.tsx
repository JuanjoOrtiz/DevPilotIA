import { useTranslation } from 'react-i18next';
import { useProjects } from '../../../features/projects/projectQueries';
import { queryErrorKey } from '../../../i18n/messages';
import { ROUTES } from '../../../routes';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { LoadingPanel } from '../../molecules/LoadingPanel/LoadingPanel';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { ProjectBrowser } from '../../organisms/ProjectBrowser/ProjectBrowser';

/** RF-PRO-02: los proyectos del usuario, con sus estados de carga, vacío y error. */
export function ProjectsPage() {
  const { t } = useTranslation();
  const projects = useProjects();

  function content() {
    if (projects.isPending) return <LoadingPanel label={t('projects.loading')} />;
    if (projects.isError) {
      return (
        <ErrorPanel
          message={t(queryErrorKey(projects.error))}
          retryLabel={t('common.retry')}
          onRetry={() => void projects.refetch()}
        />
      );
    }
    if (projects.data.length === 0) {
      return (
        <EmptyState
          icon={<Icon name="folder" size={22} />}
          title={t('projects.empty.title')}
          description={t('projects.empty.description')}
          action={
            <LinkButton to={ROUTES.newProject}>
              <Icon name="plus" />
              {t('projects.empty.action')}
            </LinkButton>
          }
        />
      );
    }
    return <ProjectBrowser projects={projects.data} />;
  }

  const hasProjects = projects.isSuccess && projects.data.length > 0;

  return (
    <>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.intro')}
        actions={
          // Sin proyectos, la llamada a crear el primero ya está en el centro de la página.
          hasProjects && (
            <LinkButton to={ROUTES.newProject}>
              <Icon name="plus" />
              {t('projects.new')}
            </LinkButton>
          )
        }
      />
      {content()}
    </>
  );
}
