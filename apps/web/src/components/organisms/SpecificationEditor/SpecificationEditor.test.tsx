import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { specification } from '../../../test/fixtures';
import { SpecificationEditor } from './SpecificationEditor';
import { formPath, toEditorValues, toSpecification } from './specificationForm';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

function renderEditor() {
  const onSave = vi.fn();
  const onDirtyChange = vi.fn();
  render(
    <MemoryRouter>
      <SpecificationEditor
        specification={specification}
        saving={false}
        cancelTo="/back"
        onSave={onSave}
        onDirtyChange={onDirtyChange}
      />
    </MemoryRouter>,
  );
  return { onSave, onDirtyChange, user: userEvent.setup() };
}

// RF-EDI-01 y 02
describe('SpecificationEditor', () => {
  it('saves the specification unchanged when nothing is edited', async () => {
    const { onSave, user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0]?.[0]).toEqual(specification);
  });

  it('adds and removes items in every kind of list', async () => {
    const { onSave, user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Añadir historia' }));
    await user.type(screen.getAllByRole('textbox', { name: 'Como' })[1] as HTMLElement, 'admin');
    await user.type(screen.getAllByRole('textbox', { name: 'Quiero' })[1] as HTMLElement, 'ver');
    await user.type(screen.getAllByRole('textbox', { name: 'Para' })[1] as HTMLElement, 'saber');
    await user.type(
      screen.getAllByRole('textbox', { name: 'Criterio 1' })[1] as HTMLElement,
      'Se ve',
    );
    await user.click(screen.getByRole('button', { name: 'Eliminar Riesgo 1' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0]?.[0];
    expect(saved.userStories).toHaveLength(2);
    expect(saved.userStories[1]).toEqual({
      asA: 'admin',
      iWant: 'ver',
      soThat: 'saber',
      acceptanceCriteria: ['Se ve'],
    });
    expect(saved.risks).toEqual([]);
  });

  it('reports when there are unsaved changes', async () => {
    const { onDirtyChange, user } = renderEditor();

    await user.type(screen.getByRole('textbox', { name: 'Título' }), '!');

    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
  });
});

describe('specification form values', () => {
  it('round-trips a specification', () => {
    expect(toSpecification(toEditorValues(specification))).toEqual(specification);
  });

  it('places each schema error on its field', () => {
    const arrays = new Set(['userStories', 'acceptanceCriteria', 'steps']);
    expect(formPath(['assumptions', 0], arrays)).toEqual(['assumptions', '0', 'value']);
    expect(formPath(['userStories', 0, 'acceptanceCriteria'], arrays)).toEqual([
      'userStories',
      '0',
      'acceptanceCriteria',
      'root',
    ]);
    expect(formPath(['testCases', 1, 'steps', 2], arrays)).toEqual([
      'testCases',
      '1',
      'steps',
      '2',
      'value',
    ]);
    expect(formPath(['title'], arrays)).toEqual(['title']);
  });
});
