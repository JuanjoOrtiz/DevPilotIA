import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  useDeleteProject,
  useProject,
  useProjectGenerations,
} from '../../../features/projects/projectQueries';
import { queryErrorKey } from '../../../i18n/messages';
import { ROUTES } from '../../../routes';
import { Button } from '../../atoms/Button/Button';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { ConfirmDialog } from '../../molecules/ConfirmDialog/ConfirmDialog';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { GenerationHistory } from '../../organisms/GenerationHistory/GenerationHistory';
import { ProjectLoadState } from '../../organisms/ProjectLoadState/ProjectLoadState';
import { ProjectSummary } from '../../organisms/ProjectSummary/ProjectSummary';

/** Página del historial que pide la dirección (`?page=2`); la primera si no dice nada válido. */
function requestedPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** RF-PRO-03 y RF-HIS-01: los datos de un proyecto y su historial; desde aquí se edita y se elimina. */
export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const page = requestedPage(searchParams.get('page'));
  const project = useProject(projectId);
  const history = useProjectGenerations(projectId, page, project.isSuccess);
  const remove = useDeleteProject();

  if (!project.isSuccess) {
    return (
      <ProjectLoadState
        title={t('projects.title')}
        error={project.error}
        onRetry={() => void project.refetch()}
      />
    );
  }

  const { name, generationCount } = project.data;

  const confirmDeletion = () =>
    remove.mutate(projectId, {
      onSuccess: () => void navigate(ROUTES.projects, { replace: true }),
    });

  const closeDialog = () => {
    setConfirming(false);
    remove.reset();
  };

  return (
    <>
      <PageHeader
        title={name}
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[{ label: t('projects.title'), to: ROUTES.projects }, { label: name }]}
          />
        }
        actions={
          <>
            <LinkButton to={ROUTES.newGeneration(projectId)}>
              <Icon name="sparkle" />
              {t('project.newGeneration')}
            </LinkButton>
            <LinkButton to={ROUTES.editProject(projectId)} variant="secondary">
              <Icon name="pencil" />
              {t('project.edit')}
            </LinkButton>
            <Button variant="dangerOutline" onClick={() => setConfirming(true)}>
              <Icon name="trash" />
              {t('project.delete')}
            </Button>
          </>
        }
      />

      <ProjectSummary project={project.data} />

      <GenerationHistory
        page={history.data}
        error={history.isError ? t(queryErrorKey(history.error)) : undefined}
        onRetry={() => void history.refetch()}
        onPageChange={(next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
        hrefFor={ROUTES.generation}
      />

      {/* RF-PRO-05: pide confirmación e informa de que se borran también las generaciones. */}
      <ConfirmDialog
        open={confirming}
        title={t('project.deleteDialog.title', { name })}
        confirmLabel={
          remove.isPending ? t('project.deleteDialog.deleting') : t('project.deleteDialog.confirm')
        }
        cancelLabel={t('common.cancel')}
        busy={remove.isPending}
        error={remove.isError ? t(queryErrorKey(remove.error)) : undefined}
        onConfirm={confirmDeletion}
        onCancel={closeDialog}
      >
        {generationCount > 0 ? (
          <Trans
            i18nKey="project.deleteDialog.generations"
            count={generationCount}
            components={{ strong: <strong /> }}
          />
        ) : (
          t('project.deleteDialog.noGenerations')
        )}{' '}
        {t('project.deleteDialog.irreversible')}
      </ConfirmDialog>
    </>
  );
}
