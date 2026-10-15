import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { AppCrashPage } from './AppCrashPage';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RNF-15
describe('AppCrashPage', () => {
  it('explains the failure and offers to reload instead of a blank screen', () => {
    render(<AppCrashPage />);

    expect(screen.getByText(/Algo ha fallado en la aplicación/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recargar la página' })).toBeTruthy();
  });
});
