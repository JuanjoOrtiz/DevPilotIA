import { finalModelResponseSchema, firstModelResponseSchema } from '@devpilot/shared';
import { describe, expect, it } from 'vitest';
import { buildRequest } from '../../application/services/GenerationPrompt.js';
import { portal } from '../../test-support/projectFixture.js';
import { FakeLLMProvider } from './FakeLLMProvider.js';

const llm = new FakeLLMProvider();

function request(inputText: string, shape: 'questions-or-specification' | 'specification') {
  return buildRequest(
    { project: portal, type: 'feature', inputText, additionalContext: null },
    { shape, timeoutMs: 1000 },
  );
}

describe('FakeLLMProvider', () => {
  it('asks questions when the description is short', async () => {
    const result = await llm.generate(
      request('Exportar pedidos a CSV', 'questions-or-specification'),
    );

    expect(firstModelResponseSchema.parse(JSON.parse(result.text)).kind).toBe('questions');
  });

  it('specifies with the stack of the project when the description is long enough', async () => {
    const result = await llm.generate(
      request(
        'Quiero que los clientes puedan exportar todo su historial de pedidos a un fichero CSV desde su área privada',
        'questions-or-specification',
      ),
    );
    const parsed = firstModelResponseSchema.parse(JSON.parse(result.text));

    expect(parsed.kind).toBe('specification');
    expect(JSON.stringify(parsed)).toContain('React, Node.js, PostgreSQL');
  });

  it('never asks in the second phase', async () => {
    const result = await llm.generate(request('Exportar pedidos a CSV', 'specification'));

    expect(finalModelResponseSchema.safeParse(JSON.parse(result.text)).success).toBe(true);
  });
});
