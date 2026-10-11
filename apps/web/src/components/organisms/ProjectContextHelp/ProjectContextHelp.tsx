import { useTranslation } from 'react-i18next';
import { InfoPanel } from '../../molecules/InfoPanel/InfoPanel';

/** Qué se hace con lo que el usuario escribe en el formulario de un proyecto. */
export function ProjectContextHelp() {
  const { t } = useTranslation();

  return (
    <InfoPanel title={t('projectForm.help.title')}>
      <p>{t('projectForm.help.sent')}</p>
      <p>{t('projectForm.help.tasks')}</p>
      <p>{t('projectForm.help.secrets')}</p>
    </InfoPanel>
  );
}
