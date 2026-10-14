import { Icon } from '../../atoms/Icon/Icon';
import styles from './StatusMessage.module.css';

interface StatusMessageProps {
  children: string;
}

/** Confirmación breve de que algo ha salido bien. Los lectores de pantalla la anuncian. */
export function StatusMessage({ children }: StatusMessageProps) {
  return (
    <p role="status" className={styles.message}>
      <Icon name="check" size={14} />
      {children}
    </p>
  );
}
