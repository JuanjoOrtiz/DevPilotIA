import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <ConfirmDialog
      open
      title="¿Eliminar «Portal de clientes»?"
      confirmLabel="Eliminar proyecto"
      cancelLabel="Cancelar"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      Se borrarán también sus 11 generaciones.
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel, ...view };
}

describe('ConfirmDialog', () => {
  // RNF-10: el diálogo se anuncia con su título y con lo que va a pasar.
  it('is an alert dialog named by its title and described by its text', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: '¿Eliminar «Portal de clientes»?' });
    const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');

    expect(dialog.hasAttribute('open')).toBe(true);
    expect(description?.textContent).toBe('Se borrarán también sus 11 generaciones.');
  });

  it('shows nothing while it is closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText('Eliminar proyecto')).toBeNull();
  });

  it('tells apart confirming from cancelling', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Eliminar proyecto' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('offers cancelling before confirming, so the focus lands on the safe option', () => {
    renderDialog();

    const labels = screen.getAllByRole('button').map((button) => button.textContent);

    expect(labels).toEqual(['Cancelar', 'Eliminar proyecto']);
  });

  it('cancels with Escape', () => {
    const { onCancel } = renderDialog();

    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('cannot be cancelled or repeated while the action is running', () => {
    const { onCancel } = renderDialog({ busy: true, confirmLabel: 'Eliminando…' });

    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Eliminando…' }).hasAttribute('disabled')).toBe(true);
  });

  it('explains why the action could not be completed', () => {
    renderDialog({ error: 'No se pudo contactar con el servidor.' });

    expect(screen.getByRole('alert').textContent).toBe('No se pudo contactar con el servidor.');
  });

  it('closes when it stops being open', () => {
    const { rerender } = renderDialog();

    rerender(
      <ConfirmDialog
        open={false}
        title="x"
        confirmLabel="x"
        cancelLabel="x"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      >
        x
      </ConfirmDialog>,
    );

    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });
});
