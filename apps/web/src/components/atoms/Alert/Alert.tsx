import type { ReactNode } from 'react';
import styles from './Alert.module.css';

interface AlertProps {
  children: ReactNode;
}

/** Aviso de error de un formulario o de una vista. Los lectores de pantalla lo anuncian al aparecer. */
export function Alert({ children }: AlertProps) {
  return (
    <p role="alert" className={styles.alert}>
      {children}
    </p>
  );
}
