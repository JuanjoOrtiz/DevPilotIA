import { describe, expect, it } from 'vitest';
import { LLMError } from '../../domain/errors/LLMError.js';
import type { LLMRequest } from '../../domain/providers/LLMProvider.js';
import { GeminiProvider } from './GeminiProvider.js';

const request: LLMRequest = {
  system: 'fixed instructions',
  prompt: '<data>{}</data>',
  shape: 'questions-or-specification',
  timeoutMs: 1000,
};

interface Captured {
  url?: string;
  init?: RequestInit;
}

function providerAnswering(status: number, body: unknown, captured: Captured = {}) {
  const fakeFetch = (url: string | URL | Request, init?: RequestInit) => {
    captured.url = String(url);
    captured.init = init;
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
  return new GeminiProvider({
    apiKey: 'secret-key',
    model: 'gemini-test',
    maxOutputTokens: 4096,
    fetch: fakeFetch as typeof fetch,
  });
}

async function errorCode(provider: GeminiProvider): Promise<string> {
  const error = await provider.generate(request).then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof LLMError)) throw new Error('Expected an LLMError');
  return error.code;
}

describe('GeminiProvider', () => {
  it('asks for JSON with the response schema and reads text, model and tokens', async () => {
    const captured: Captured = {};
    const provider = providerAnswering(
      200,
      {
        candidates: [
          {
            content: {
              parts: [{ text: 'thinking…', thought: true }, { text: '{"kind":' }, { text: '"x"}' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40, thoughtsTokenCount: 10 },
        modelVersion: 'gemini-test-001',
      },
      captured,
    );

    const result = await provider.generate(request);

    expect(result).toEqual({
      text: '{"kind":"x"}',
      model: 'gemini-test-001',
      inputTokens: 120,
      outputTokens: 50,
    });
    expect(captured.url).toContain('/models/gemini-test:generateContent');
    expect(new Headers(captured.init?.headers).get('x-goog-api-key')).toBe('secret-key');
    const body = JSON.parse(String(captured.init?.body)) as {
      systemInstruction: { parts: { text: string }[] };
      generationConfig: {
        responseMimeType: string;
        maxOutputTokens: number;
        responseSchema: object;
      };
    };
    expect(body.systemInstruction.parts[0]?.text).toBe('fixed instructions');
    expect(body.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
      responseSchema: { type: 'object', required: ['kind'] },
    });
  });

  it('translates the provider failures into domain codes', async () => {
    expect(await errorCode(providerAnswering(429, {}))).toBe('LLM_RATE_LIMITED');
    expect(await errorCode(providerAnswering(503, {}))).toBe('LLM_UNAVAILABLE');
    expect(await errorCode(providerAnswering(400, {}))).toBe('LLM_UNAVAILABLE');
    expect(
      await errorCode(providerAnswering(200, { promptFeedback: { blockReason: 'SAFETY' } })),
    ).toBe('LLM_CONTENT_BLOCKED');
    expect(
      await errorCode(
        providerAnswering(200, { candidates: [{ finishReason: 'PROHIBITED_CONTENT' }] }),
      ),
    ).toBe('LLM_CONTENT_BLOCKED');
  });

  it('turns a timeout into LLM_TIMEOUT and a network failure into LLM_UNAVAILABLE', async () => {
    const failing = (error: Error) =>
      new GeminiProvider({
        apiKey: 'k',
        model: 'm',
        maxOutputTokens: 1024,
        fetch: (() => Promise.reject(error)) as typeof fetch,
      });

    expect(await errorCode(failing(new DOMException('slow', 'TimeoutError')))).toBe('LLM_TIMEOUT');
    expect(await errorCode(failing(new TypeError('fetch failed')))).toBe('LLM_UNAVAILABLE');
  });

  it('never puts the key in an error message', async () => {
    const error = await providerAnswering(403, {})
      .generate(request)
      .catch((reason: unknown) => reason);

    expect(String((error as Error).message)).not.toContain('secret-key');
  });
});
