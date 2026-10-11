import type { CreateProjectRequest } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toSubmitFailure } from '../../../features/forms/submitFailure';
import { useCreateProject } from '../../../features/projects/projectQueries';
import { ROUTES } from '../../../routes';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { ProjectContextHelp } from '../../organisms/ProjectContextHelp/ProjectContextHelp';
import { ProjectForm } from '../../organisms/ProjectForm/ProjectForm';
import { FormPageLayout } from '../../templates/FormPageLayout/FormPageLayout';

/** RF-PRO-01. Al crear el proyecto se abre su detalle. */
export function NewProjectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateProject();

  const submit = (values: CreateProjectRequest) =>
    create.mutateAsync(values).then((project) => {
      void navigate(ROUTES.project(project.id));
      return undefined;
    }, toSubmitFailure);

  return (
    <>
      <PageHeader
        title={t('projectForm.newTitle')}
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[
              { label: t('projects.title'), to: ROUTES.projects },
              { label: t('projectForm.newTitle') },
            ]}
          />
        }
      />
      <FormPageLayout aside={<ProjectContextHelp />}>
        <ProjectForm
          submitLabel={t('projectForm.create')}
          submittingLabel={t('projectForm.creating')}
          cancelTo={ROUTES.projects}
          onSubmit={submit}
        />
      </FormPageLayout>
    </>
  );
}
