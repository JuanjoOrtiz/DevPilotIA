import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { formatDateTime } from '../../../i18n/format';
import { generation, pageOf } from '../../../test/fixtures';
import { GenerationHistory } from './GenerationHistory';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

const noop = () => undefined;

// RF-HIS-01
describe('GenerationHistory', () => {
  it('shows the title, the type, the complexity, the status and the date of each generation', () => {
    const page = pageOf([
      generation({ title: 'Exportar facturas a PDF', complexity: 'L' }),
      generation({ type: 'bug', title: 'La sesión caduca al subir un adjunto', complexity: 'S' }),
    ]);
    render(<GenerationHistory page={page} onRetry={noop} onPageChange={noop} />);

    const [, first, second] = screen.getAllByRole('row');
    const cells = (row: HTMLElement | undefined) =>
      within(row as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent);

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Título',
      'Tipo',
      'Complejidad',
      'Estado',
      'Fecha',
    ]);
    expect(within(first as HTMLElement).getByRole('rowheader').textContent).toBe(
      'Exportar facturas a PDF',
    );
    expect(cells(first)).toEqual([
      'Funcionalidad',
      'L',
      'Completada',
      formatDateTime('2026-10-10T12:00:00.000Z', 'es'),
    ]);
    expect(cells(second).slice(0, 2)).toEqual(['Bug', 'S']);
  });

  it('shows what the user wrote while a generation has no title', () => {
    const page = pageOf([
      generation({
        status: 'generating',
        title: null,
        complexity: null,
        inputExcerpt: 'Quiero exportar las facturas a PDF',
      }),
      generation({ status: 'failed', title: null, complexity: null }),
    ]);
    render(<GenerationHistory page={page} onRetry={noop} onPageChange={noop} />);

    expect(
      screen.getByRole('rowheader', { name: 'Quiero exportar las facturas a PDF' }),
    ).toBeTruthy();
    expect(screen.getByText('Generando')).toBeTruthy();
    expect(screen.getByText('Fallida')).toBeTruthy();
    // RNF-10: una raya no dice nada a quien no la ve; el texto sí.
    expect(screen.getAllByText('Sin estimar')).toHaveLength(2);
  });

  it('marks the edited generations and the sample one', () => {
    const page = pageOf([generation({ isEdited: true }), generation({ isSample: true })]);
    render(<GenerationHistory page={page} onRetry={noop} onPageChange={noop} />);

    const [, edited, sample] = screen.getAllByRole('row');

    expect(within(edited as HTMLElement).getByText('Editada')).toBeTruthy();
    expect(within(edited as HTMLElement).queryByText('Ejemplo')).toBeNull();
    expect(within(sample as HTMLElement).getByText('Ejemplo')).toBeTruthy();
  });

  it('says which generations are on screen and moves between pages', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const items = Array.from({ length: 10 }, () => generation());
    render(
      <GenerationHistory
        page={pageOf(items, { page: 2, total: 23 })}
        onRetry={noop}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('11–20 de 23 generaciones')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('disables the buttons that lead nowhere', () => {
    render(<GenerationHistory page={pageOf([generation()])} onRetry={noop} onPageChange={noop} />);

    expect(screen.getByText('1–1 de 1 generación')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anterior' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true);
  });

  it('leads back to the last page from a page past the end', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <GenerationHistory
        page={pageOf([], { page: 9, total: 23 })}
        onRetry={noop}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('No hay nada en esta página.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  // RNF-09: estados de carga, vacío y error.
  it('has a loading, an empty and an error state', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <GenerationHistory page={undefined} onRetry={onRetry} onPageChange={noop} />,
    );
    expect(screen.getByRole('status').textContent).toBe('Cargando historial…');

    rerender(<GenerationHistory page={pageOf([])} onRetry={onRetry} onPageChange={noop} />);
    expect(
      screen.getByRole('heading', { name: 'Este proyecto todavía no tiene generaciones' }),
    ).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();

    rerender(
      <GenerationHistory
        page={undefined}
        error="No se pudo contactar con el servidor."
        onRetry={onRetry}
        onPageChange={noop}
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('No se pudo contactar con el servidor.');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  // SEG-05: lo que escribió el usuario y lo que devolvió el modelo se pintan como texto.
  it('shows a title that contains markup as plain text', () => {
    const title = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <GenerationHistory
        page={pageOf([generation({ title })])}
        onRetry={noop}
        onPageChange={noop}
      />,
    );

    expect(screen.getByRole('rowheader', { name: title })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });
});
