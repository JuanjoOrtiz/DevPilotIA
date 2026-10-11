import type { CreateProjectRequest } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { toSubmitFailure } from '../../../features/forms/submitFailure';
import { useProject, useUpdateProject } from '../../../features/projects/projectQueries';
import { ROUTES } from '../../../routes';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { ProjectContextHelp } from '../../organisms/ProjectContextHelp/ProjectContextHelp';
import { ProjectForm } from '../../organisms/ProjectForm/ProjectForm';
import { ProjectLoadState } from '../../organisms/ProjectLoadState/ProjectLoadState';
import { FormPageLayout } from '../../templates/FormPageLayout/FormPageLayout';

/** RF-PRO-04: el mismo formulario que al crear, con los datos del proyecto. */
export function EditProjectPage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const update = useUpdateProject(projectId);

  if (!project.isSuccess) {
    return (
      <ProjectLoadState
        title={t('projectForm.editTitle')}
        error={project.error}
        onRetry={() => void project.refetch()}
      />
    );
  }

  const { name, description, techStack, conventions } = project.data;
  const detail = ROUTES.project(projectId);

  const submit = (values: CreateProjectRequest) =>
    update.mutateAsync(values).then(() => {
      void navigate(detail);
      return undefined;
    }, toSubmitFailure);

  return (
    <>
      <PageHeader
        title={t('projectForm.editTitle')}
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[
              { label: t('projects.title'), to: ROUTES.projects },
              { label: name, to: detail },
              { label: t('projectForm.editCrumb') },
            ]}
          />
        }
      />
      <FormPageLayout aside={<ProjectContextHelp />}>
        <ProjectForm
          initialValues={{ name, description, techStack, conventions }}
          submitLabel={t('projectForm.save')}
          submittingLabel={t('projectForm.saving')}
          cancelTo={detail}
          onSubmit={submit}
        />
      </FormPageLayout>
    </>
  );
}
