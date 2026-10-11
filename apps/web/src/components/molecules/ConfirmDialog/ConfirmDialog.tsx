import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Qué va a pasar si se confirma. */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** La acción está en marcha: no se puede cancelar ni repetir. */
  busy?: boolean;
  /** Por qué no se pudo completar la acción, ya traducido. */
  error?: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación de una acción que no se puede deshacer. Usa el `<dialog>` del navegador,
 * que ya retiene el foco, cierra con Escape y devuelve el foco al cerrarse (RNF-10).
 * El foco entra por «Cancelar»: confirmar exige un gesto deliberado.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={styles.dialog}
      onCancel={(event) => {
        // Escape: decide quien usa el diálogo, no el navegador.
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      {open && (
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <div id={descriptionId} className={styles.description}>
            {children}
          </div>
          {error && <Alert>{error}</Alert>}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant="danger" disabled={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
