import type { CreateGenerationRequest } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useCreateGeneration } from '../../../features/ai-analysis/generationQueries';
import { generationFailureMessage } from '../../../features/ai-analysis/quotaMessage';
import { toSubmitFailure } from '../../../features/forms/submitFailure';
import { useProject } from '../../../features/projects/projectQueries';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { ROUTES } from '../../../routes';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { GenerationForm } from '../../organisms/GenerationForm/GenerationForm';
import { GenerationHelp } from '../../organisms/GenerationHelp/GenerationHelp';
import { ProjectLoadState } from '../../organisms/ProjectLoadState/ProjectLoadState';
import { FormPageLayout } from '../../templates/FormPageLayout/FormPageLayout';

/** RF-GEN-01: describe una tarea o un bug. Al enviarla se abre la generación, que ya está en curso. */
export function NewGenerationPage() {
  const { t } = useTranslation();
  const format = useDateFormat();
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const create = useCreateGeneration(projectId);

  if (!project.isSuccess) {
    return (
      <ProjectLoadState
        title={t('generation.newTitle')}
        error={project.error}
        onRetry={() => void project.refetch()}
      />
    );
  }

  const submit = (values: CreateGenerationRequest) =>
    create.mutateAsync(values).then((generation) => {
      void navigate(ROUTES.generation(generation.id));
      return undefined;
    }, toSubmitFailure);

  return (
    <>
      <PageHeader
        title={t('generation.newTitle')}
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[
              { label: t('projects.title'), to: ROUTES.projects },
              { label: project.data.name, to: ROUTES.project(projectId) },
              { label: t('generation.newTitle') },
            ]}
          />
        }
      />
      <FormPageLayout aside={<GenerationHelp projectName={project.data.name} />}>
        <GenerationForm
          cancelTo={ROUTES.project(projectId)}
          onSubmit={submit}
          describeFailure={(failure) => generationFailureMessage(failure, t, format.dateTime)}
        />
      </FormPageLayout>
    </>
  );
}
