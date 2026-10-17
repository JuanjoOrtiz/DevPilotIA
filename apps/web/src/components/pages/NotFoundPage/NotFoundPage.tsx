import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../routes';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { EmptyState } from '../../molecules/EmptyState/EmptyState';
import { PageHeader } from '../../molecules/PageHeader/PageHeader';

/**
 * Una dirección que no corresponde a ninguna página. Antes se redirigía al dashboard sin
 * avisar, y quien seguía un enlace mal escrito no sabía qué había pasado.
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t('notFound.title')}
        breadcrumbs={<Breadcrumbs label={t('common.breadcrumbs')} items={[{ label: '404' }]} />}
      />
      <EmptyState
        icon={<Icon name="search" size={22} />}
        title={t('notFound.heading')}
        description={t('notFound.description')}
        action={<LinkButton to={ROUTES.dashboard}>{t('notFound.action')}</LinkButton>}
      />
    </>
  );
}
