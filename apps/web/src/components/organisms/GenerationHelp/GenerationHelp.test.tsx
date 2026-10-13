import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { GenerationHelp } from './GenerationHelp';

beforeEach(async () => {
  await i18n.changeLanguage('es');
});

afterEach(cleanup);

// RF-GEN-08
describe('GenerationHelp', () => {
  it('names the project whose context is sent and warns about confidential data', () => {
    render(<GenerationHelp projectName="Portal de clientes" />);

    expect(screen.getByText(/«Portal de clientes»/)).toBeTruthy();
    expect(screen.getByText(/No pegues código/)).toBeTruthy();
  });
});
