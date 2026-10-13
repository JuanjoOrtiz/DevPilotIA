import { useTranslation } from 'react-i18next';
import { InfoPanel } from '../../molecules/InfoPanel/InfoPanel';

interface GenerationHelpProps {
  projectName: string;
}

/** Qué recibe la IA y qué no se debe pegar (RF-GEN-08), junto al formulario de generación. */
export function GenerationHelp({ projectName }: GenerationHelpProps) {
  const { t } = useTranslation();

  return (
    <InfoPanel title={t('generation.help.title')}>
      <p>{t('generation.help.context', { project: projectName })}</p>
      <p>{t('generation.help.questions')}</p>
      <p>
        <strong>{t('generation.help.privacy')}</strong>
      </p>
    </InfoPanel>
  );
}
