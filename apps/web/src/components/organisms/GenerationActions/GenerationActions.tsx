import type { ExportFormat } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import styles from './GenerationActions.module.css';

interface GenerationActionsProps {
  /** Hay especificación: se puede editar, regenerar, exportar y copiar. */
  hasSpecification: boolean;
  /** Ruta del editor. */
  editTo: string;
  busy: 'regenerate' | 'export' | 'copy' | null;
  onRegenerate: () => void;
  onExport: (format: ExportFormat) => void;
  onCopy: () => void;
  onDelete: () => void;
}

/**
 * Lo que se puede hacer con una generación: editarla (RF-EDI-01), regenerarla
 * (RF-GEN-06), exportarla o copiarla (RF-EXP-01 a 03) y eliminarla (RF-HIS-04).
 */
export function GenerationActions({
  hasSpecification,
  editTo,
  busy,
  onRegenerate,
  onExport,
  onCopy,
  onDelete,
}: GenerationActionsProps) {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t('generation.actions.label')} className={styles.actions}>
      {hasSpecification && (
        <div className={styles.toolbar}>
          <LinkButton to={editTo} variant="secondary">
            <Icon name="pencil" />
            {t('generation.actions.edit')}
          </LinkButton>
          <Button variant="secondary" disabled={busy !== null} onClick={onRegenerate}>
            <Icon name="sparkle" />
            {busy === 'regenerate'
              ? t('generation.actions.regenerating')
              : t('generation.actions.regenerate')}
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => onExport('md')}>
            <Icon name="download" />
            {t('generation.export.markdown')}
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => onExport('json')}>
            <Icon name="download" />
            {t('generation.export.json')}
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={onCopy}>
            <Icon name="check" />
            {t('generation.export.copy')}
          </Button>
        </div>
      )}
      <Button variant="dangerOutline" disabled={busy !== null} onClick={onDelete}>
        <Icon name="trash" />
        {t('generation.actions.delete')}
      </Button>
    </div>
  );
}
