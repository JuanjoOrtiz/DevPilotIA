import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { generationDetail, questions } from '../../../test/fixtures';
import { GenerationRequest } from './GenerationRequest';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

describe('GenerationRequest', () => {
  it('shows the description, the context and the answers, marking the blank ones', () => {
    render(
      <GenerationRequest
        generation={generationDetail({
          additionalContext: 'Solo en iOS',
          clarifyingQuestions: questions,
          clarificationAnswers: [
            { questionId: 'q1', answer: 'Fecha e importe' },
            { questionId: 'q2', answer: '' },
          ],
        })}
      />,
    );

    expect(screen.getByText('Solo en iOS')).toBeTruthy();
    expect(screen.getByText('Fecha e importe')).toBeTruthy();
    expect(screen.getByText('Sin respuesta')).toBeTruthy();
  });

  it('leaves out the answers while there are none', () => {
    render(<GenerationRequest generation={generationDetail({ clarifyingQuestions: questions })} />);

    expect(screen.queryByText('Tus respuestas')).toBeNull();
  });
});
