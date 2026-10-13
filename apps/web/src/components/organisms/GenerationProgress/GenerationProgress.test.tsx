import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { GenerationProgress } from './GenerationProgress';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-GEN-04
describe('GenerationProgress', () => {
  it('announces that the specification is being generated', () => {
    render(<GenerationProgress withAnswers={false} />);

    expect(screen.getByRole('status').textContent).toMatch(/Generando la especificación/);
    expect(screen.getByText(/\(En curso\)/).parentElement?.textContent).toMatch(
      /La IA está trabajando/,
    );
  });

  it('says it is using the answers in the second phase', () => {
    render(<GenerationProgress withAnswers />);

    expect(screen.getByRole('heading', { name: 'Generando con tus respuestas' })).toBeTruthy();
  });
});
