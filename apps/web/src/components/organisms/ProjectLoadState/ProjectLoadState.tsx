import { useTranslation } from 'react-i18next';
import { isNotFound, queryErrorKey } from '../../../i18n/messages';
import { ROUTES } from '../../../routes';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { ErrorPanel } from '../../molecules/ErrorPanel/ErrorPanel';
import { LoadingPanel } from '../../molecules/LoadingPanel/LoadingPanel';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';

interface ProjectLoadStateProps {
  /** Título de la página mientras no se conoce el nombre del proyecto. */
  title: string;
  /** Por qué no se pudo cargar. Sin error, se está cargando. */
  error: unknown;
  onRetry: () => void;
}

/**
 * Lo que muestra una página de proyecto mientras no tiene el proyecto: que se está
 * cargando, que no existe o que algo ha fallado (RNF-09). Un proyecto de otra persona
 * se ve igual que uno que no existe.
 */
export function ProjectLoadState({ title, error, onRetry }: ProjectLoadStateProps) {
  const { t } = useTranslation();

  function content() {
    if (!error) return <LoadingPanel label={t('project.loading')} />;
    if (isNotFound(error)) {
      return (
        <EmptyState
          title={t('project.notFound.title')}
          description={t('project.notFound.description')}
          action={<LinkButton to={ROUTES.projects}>{t('project.notFound.action')}</LinkButton>}
        />
      );
    }
    return (
      <ErrorPanel
        message={t(queryErrorKey(error))}
        retryLabel={t('common.retry')}
        onRetry={onRetry}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={
          <Breadcrumbs
            label={t('common.breadcrumbs')}
            items={[{ label: t('projects.title'), to: ROUTES.projects }, { label: title }]}
          />
        }
      />
      {content()}
    </>
  );
}
