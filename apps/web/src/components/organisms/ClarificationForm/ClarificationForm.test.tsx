import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { questions } from '../../../test/fixtures';
import { ClarificationForm } from './ClarificationForm';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

function renderForm(busy = false) {
  const onAnswer = vi.fn();
  const onSkip = vi.fn();
  render(
    <ClarificationForm questions={questions} busy={busy} onAnswer={onAnswer} onSkip={onSkip} />,
  );
  return { onAnswer, onSkip, user: userEvent.setup() };
}

// RF-GEN-09
describe('ClarificationForm', () => {
  it('shows each question with why it is asked', () => {
    renderForm();

    expect(screen.getByText(questions[0]?.question ?? '')).toBeTruthy();
    expect(screen.getByText(questions[1]?.why ?? '')).toBeTruthy();
  });

  it('sends one trimmed answer per question, blank ones included', async () => {
    const { onAnswer, user } = renderForm();

    await user.type(screen.getByRole('textbox', { name: 'Tu respuesta a la pregunta 2' }), ' 500 ');
    await user.click(screen.getByRole('button', { name: 'Generar especificación' }));

    expect(onAnswer).toHaveBeenCalledWith([
      { questionId: 'q1', answer: '' },
      { questionId: 'q2', answer: '500' },
    ]);
  });

  it('does not send an answer over 500 characters', async () => {
    const { onAnswer, user } = renderForm();
    const field = screen.getByRole('textbox', { name: 'Tu respuesta a la pregunta 1' });

    await user.click(field);
    await user.paste('a'.repeat(501));

    expect(screen.getByText('Cada respuesta puede tener 500 caracteres como máximo.')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Generar especificación' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('can skip the questions, and disables both buttons while sending', async () => {
    const { onSkip, user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Generar sin responder' }));
    expect(onSkip).toHaveBeenCalled();

    cleanup();
    renderForm(true);
    expect(
      (screen.getByRole('button', { name: 'Generar sin responder' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
