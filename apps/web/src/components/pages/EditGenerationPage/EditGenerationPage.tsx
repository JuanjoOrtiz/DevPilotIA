import type { GenerationDetail, Specification } from '@devpilot/shared';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router';
import {
  useGeneration,
  useSpecificationTranslation,
  useUpdateSpecification,
} from '../../../features/ai-analysis/generationQueries';
import { useProject } from '../../../features/projects/projectQueries';
import { useSpecLanguage } from '../../../hooks/useSpecLanguage';
import { isNotFound, queryErrorKey } from '../../../i18n/messages';
import { ROUTES } from '../../../routes';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { ConfirmDialog } from '../../molecules/ConfirmDialog/ConfirmDialog';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { InfoPanel } from '../../molecules/InfoPanel/InfoPanel';
import { LoadingPanel } from '../../molecules/LoadingPanel/LoadingPanel';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { SpecificationEditor } from '../../organisms/SpecificationEditor/SpecificationEditor';
import { FormPageLayout } from '../../templates/FormPageLayout/FormPageLayout';

/** RF-EDI-01, 02 y 04: editar la especificación de una generación completada. */
export function EditGenerationPage() {
  const { t } = useTranslation();
  const { generationId = '' } = useParams();
  const generation = useGeneration(generationId);

  if (!generation.isSuccess) {
    return (
      <>
        <PageHeader title={t('specification.editor.title')} />
        {!generation.error ? (
          <LoadingPanel label={t('generation.loading')} />
        ) : isNotFound(generation.error) ? (
          <EmptyState
            title={t('generation.notFound.title')}
            description={t('generation.notFound.description')}
            action={<LinkButton to={ROUTES.projects}>{t('generation.notFound.action')}</LinkButton>}
          />
        ) : (
          <ErrorPanel
            message={t(queryErrorKey(generation.error))}
            retryLabel={t('common.retry')}
            onRetry={() => void generation.refetch()}
          />
        )}
      </>
    );
  }

  // Solo se edita una especificación ya generada.
  if (generation.data.status !== 'completed' || !generation.data.specification) {
    return <Navigate to={ROUTES.generation(generationId)} replace />;
  }
  return <EditContent generation={generation.data} />;
}

function EditContent({ generation }: { generation: GenerationDetail }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const project = useProject(generation.projectId);
  const language = useSpecLanguage();
  const translation = useSpecificationTranslation(generation, language);
  const update = useUpdateSpecification(generation);
  const [dirty, setDirty] = useState(false);
  const leaving = useRef(false);
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  // RF-EDI-04: salir con cambios sin guardar pide confirmación, dentro de la aplicación…
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );
  // …y también al cerrar o recargar la pestaña.
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty && !leaving.current) event.preventDefault();
      },
      [dirty],
    ),
  );

  const detail = ROUTES.generation(generation.id);
  // Se edita lo que se ve: la traducción al idioma de la interfaz, si la hay.
  const source = translation.data ?? generation.specification;
  const sourceLanguage = translation.data ? language : generation.language;
  const title = source?.title ?? generation.title ?? '';

  function save(specification: Specification) {
    update.mutate(
      { specification, language: sourceLanguage },
      {
        onSuccess: () => {
          leaving.current = true;
          void navigate(detail);
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title={t('specification.editor.title')}
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[
              { label: t('projects.title'), to: ROUTES.projects },
              ...(project.data
                ? [{ label: project.data.name, to: ROUTES.project(generation.projectId) }]
                : []),
              { label: title, to: detail },
              { label: t('specification.editor.crumb') },
            ]}
          />
        }
      />
      <FormPageLayout
        aside={
          <InfoPanel title={t('specification.editor.title')}>
            <p>{t('specification.editor.intro')}</p>
          </InfoPanel>
        }
      >
        {translation.isFetching || !source ? (
          <LoadingPanel label={t('generation.translation.translating')} />
        ) : (
          <SpecificationEditor
            specification={source}
            saving={update.isPending}
            error={update.isError ? t(queryErrorKey(update.error)) : undefined}
            cancelTo={detail}
            onSave={save}
            onDirtyChange={onDirtyChange}
          />
        )}
      </FormPageLayout>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={t('specification.editor.unsaved.title')}
        confirmLabel={t('specification.editor.unsaved.leave')}
        cancelLabel={t('specification.editor.unsaved.stay')}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        {t('specification.editor.unsaved.body')}
      </ConfirmDialog>
    </>
  );
}
