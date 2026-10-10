import { useTranslation } from 'react-i18next';
import type { ServerState } from '../../../hooks/useServerStatus';
import { Button } from '../../atoms/Button/Button';
import { Spinner } from '../../atoms/Spinner/Spinner';
import { StatusBadge, type StatusTone } from '../../atoms/StatusBadge/StatusBadge';
import styles from './ServerStatusCard.module.css';

interface ServerStatusCardProps {
  state: ServerState;
  version: string | undefined;
  onRetry: () => void;
}

const TONE_BY_STATE: Record<ServerState, StatusTone> = {
  checking: 'neutral',
  waking: 'warning',
  up: 'success',
  degraded: 'danger',
  unreachable: 'danger',
};

/** Tarjeta con el estado de la API y de la base de datos. No pide datos: los recibe. */
export function ServerStatusCard({ state, version, onRetry }: ServerStatusCardProps) {
  const { t } = useTranslation();
  const waiting = state === 'checking' || state === 'waking';

  return (
    <section className={styles.card} aria-labelledby="server-status-title">
      <div className={styles.header}>
        <h2 id="server-status-title" className={styles.title}>
          {t('serverStatus.title')}
        </h2>
        <StatusBadge tone={TONE_BY_STATE[state]}>{t(`serverStatus.${state}`)}</StatusBadge>
      </div>

      <p className={styles.hint} role="status">
        {waiting && <Spinner />}
        <span>{t(`serverStatus.${state}Hint`)}</span>
      </p>

      {(state === 'unreachable' || version) && (
        <div className={styles.footer}>
          {version && (
            <span className={styles.version}>{t('serverStatus.version', { version })}</span>
          )}
          {state === 'unreachable' && (
            <Button variant="secondary" onClick={onRetry}>
              {t('serverStatus.retry')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
