import type { GenerationDetail } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import {
  useAnswerClarification,
  useExportGeneration,
  useGeneration,
  useRetryGeneration,
  useSpecificationTranslation,
} from '../../../features/ai-analysis/generationQueries';
import { generationFailureMessage } from '../../../features/ai-analysis/quotaMessage';
import { toSubmitFailure } from '../../../features/forms/submitFailure';
import { useProject } from '../../../features/projects/projectQueries';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useSpecLanguage } from '../../../hooks/useSpecLanguage';
import { errorMessageKey, isNotFound, queryErrorKey } from '../../../i18n/messages';
import { ROUTES } from '../../../routes';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { LoadingPanel } from '../../molecules/LoadingPanel/LoadingPanel';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';
import { TranslationNotice } from '../../molecules/TranslationNotice/TranslationNotice';
import { ClarificationForm } from '../../organisms/ClarificationForm/ClarificationForm';
import { GenerationFailure } from '../../organisms/GenerationFailure/GenerationFailure';
import { GenerationProgress } from '../../organisms/GenerationProgress/GenerationProgress';
import { GenerationRequest } from '../../organisms/GenerationRequest/GenerationRequest';
import { SpecificationView } from '../../organisms/SpecificationView/SpecificationView';
import { FormPageLayout } from '../../templates/FormPageLayout/FormPageLayout';

/**
 * Una generación (RF-GEN-04, RF-GEN-09 y RF-HIS-03). Según su estado muestra el progreso,
 * las preguntas de la IA, la especificación o el fallo con su reintento.
 */
export function GenerationPage() {
  const { t } = useTranslation();
  const { generationId = '' } = useParams();
  const generation = useGeneration(generationId);

  if (!generation.isSuccess) {
    return (
      <>
        <PageHeader title={t('generation.loading')} />
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

  return <GenerationContent generation={generation.data} />;
}

function GenerationContent({ generation }: { generation: GenerationDetail }) {
  const { t } = useTranslation();
  const format = useDateFormat();
  const navigate = useNavigate();
  const project = useProject(generation.projectId);
  const answer = useAnswerClarification(generation.id);
  const retry = useRetryGeneration();
  const exportFile = useExportGeneration(generation.id);
  const language = useSpecLanguage();
  const translation = useSpecificationTranslation(generation, language);

  // Mientras llega la traducción, o si falla, se ve la especificación original.
  const specification = translation.data ?? generation.specification;
  const title =
    specification?.title ?? generation.title ?? t(`history.status.${generation.status}`);

  function translationNotice() {
    if (translation.isFetching) {
      return (
        <TranslationNotice state="translating" message={t('generation.translation.translating')} />
      );
    }
    if (translation.isError) {
      return (
        <TranslationNotice
          state="failed"
          message={t('generation.translation.failed', {
            reason: t(queryErrorKey(translation.error)),
          })}
          retryLabel={t('common.retry')}
          onRetry={() => void translation.refetch()}
        />
      );
    }
    return null;
  }
  const projectName = project.data?.name;

  function main() {
    switch (generation.status) {
      case 'generating':
        return <GenerationProgress withAnswers={generation.clarificationAnswers !== null} />;
      case 'needs_clarification':
        return (
          <ClarificationForm
            questions={generation.clarifyingQuestions ?? []}
            busy={answer.isPending}
            error={answer.isError ? t(queryErrorKey(answer.error)) : undefined}
            onAnswer={(answers) => answer.mutate({ answers })}
            onSkip={() => answer.mutate({ skip: true })}
          />
        );
      case 'failed':
        return (
          <GenerationFailure
            reason={t(errorMessageKey(generation.errorCode ?? 'INTERNAL_ERROR'))}
            retryError={
              retry.isError
                ? generationFailureMessage(toSubmitFailure(retry.error), t, format.dateTime)
                : undefined
            }
            retrying={retry.isPending}
            onRetry={() =>
              retry.mutate(generation, {
                onSuccess: (created) => void navigate(ROUTES.generation(created.id)),
              })
            }
            backTo={ROUTES.project(generation.projectId)}
          />
        );
      case 'completed':
        return specification ? (
          <>
            {translationNotice()}
            <SpecificationView specification={specification} type={generation.type} />
          </>
        ) : null;
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        actions={
          generation.status === 'completed' &&
          generation.specification && (
            <Button
              variant="secondary"
              disabled={exportFile.isPending}
              onClick={() => exportFile.mutate()}
            >
              <Icon name="download" />
              {exportFile.isPending
                ? t('generation.export.exporting')
                : t('generation.export.markdown')}
            </Button>
          )
        }
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[
              { label: t('projects.title'), to: ROUTES.projects },
              ...(projectName
                ? [{ label: projectName, to: ROUTES.project(generation.projectId) }]
                : []),
              { label: title },
            ]}
          />
        }
      />
      {exportFile.isError && (
        <Alert>
          {t('generation.export.failed', { reason: t(queryErrorKey(exportFile.error)) })}
        </Alert>
      )}
      <FormPageLayout aside={<GenerationRequest generation={generation} />}>
        {main()}
      </FormPageLayout>
    </>
  );
}
