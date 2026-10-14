import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { apiRequest } from './apiClient';
import { answerClarification, createGeneration } from './generationService';

vi.mock('./apiClient', () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);
const body = () => request.mock.calls.at(-1)?.[1]?.body;

beforeEach(() => {
  request.mockResolvedValue({ generation: {} });
});

afterEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage('es');
});

// La especificación se escribe en el idioma de la interfaz, no en el del texto del usuario.
describe('generation requests', () => {
  it('ask for the specification in the language of the interface', async () => {
    await i18n.changeLanguage('en');
    await createGeneration('p1', {
      type: 'feature',
      inputText: 'Exportar pedidos a CSV con filtros',
    });
    expect(body()).toMatchObject({
      inputText: 'Exportar pedidos a CSV con filtros',
      language: 'en',
    });

    await i18n.changeLanguage('es');
    await createGeneration('p1', {
      type: 'bug',
      inputText: 'The login fails with accented passwords',
    });
    expect(body()).toMatchObject({ language: 'es' });
  });

  it('send the language again when answering the questions', async () => {
    await i18n.changeLanguage('en');
    await answerClarification('g1', { skip: true });

    expect(body()).toEqual({ skip: true, language: 'en' });
  });
});
