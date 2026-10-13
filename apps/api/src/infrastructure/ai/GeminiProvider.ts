import { LLMError } from '../../domain/errors/LLMError.js';
import type { LLMProvider, LLMRequest, LLMResult } from '../../domain/providers/LLMProvider.js';
import { responseSchemaFor } from './responseSchema.js';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Motivos de parada que significan que los filtros del proveedor han bloqueado el contenido. */
const BLOCKED_FINISH_REASONS = new Set([
  'SAFETY',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
  'RECITATION',
  'IMAGE_SAFETY',
]);

export interface GeminiConfig {
  apiKey: string;
  model: string;
  /** Tope de tokens de salida (SEG-13). */
  maxOutputTokens: number;
  /** Para los tests: por defecto, el `fetch` global. */
  fetch?: typeof fetch;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
}

/**
 * Gemini API (`generateContent`) con salida estructurada. Traduce cada fallo a un código
 * de dominio; la clave nunca sale en un mensaje de error ni en el registro (SEG-12).
 */
export class GeminiProvider implements LLMProvider {
  private readonly config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  async generate(request: LLMRequest): Promise<LLMResult> {
    const doFetch = this.config.fetch ?? fetch;
    const url = `${API_URL}/${encodeURIComponent(this.config.model)}:generateContent`;

    let response: Response;
    try {
      response = await doFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: this.config.maxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: responseSchemaFor(request.shape),
          },
        }),
        signal: AbortSignal.timeout(request.timeoutMs),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new LLMError('LLM_TIMEOUT', 'The model did not answer in time');
      }
      throw new LLMError('LLM_UNAVAILABLE', 'Could not reach the model');
    }

    if (response.status === 429) {
      throw new LLMError('LLM_RATE_LIMITED', 'The model rate limit was reached');
    }
    if (!response.ok) {
      // 4xx que no es 429: clave, modelo o petición mal configurados. Se registra el estado,
      // nunca la clave ni el cuerpo de la petición.
      console.error(`Gemini API answered ${response.status}`);
      throw new LLMError('LLM_UNAVAILABLE', `The model answered ${response.status}`);
    }

    let body: GeminiResponse;
    try {
      body = (await response.json()) as GeminiResponse;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new LLMError('LLM_TIMEOUT', 'The model did not answer in time');
      }
      throw new LLMError('LLM_UNAVAILABLE', 'The model answer could not be read');
    }

    if (body.promptFeedback?.blockReason) {
      throw new LLMError('LLM_CONTENT_BLOCKED', 'The request was blocked by the model filters');
    }
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason && BLOCKED_FINISH_REASONS.has(candidate.finishReason)) {
      throw new LLMError('LLM_CONTENT_BLOCKED', 'The answer was blocked by the model filters');
    }

    // Los modelos con razonamiento pueden devolver partes de «pensamiento»: no son la respuesta.
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('');
    const usage = body.usageMetadata;

    return {
      text,
      model: body.modelVersion ?? this.config.model,
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens:
        usage?.candidatesTokenCount === undefined
          ? null
          : usage.candidatesTokenCount + (usage.thoughtsTokenCount ?? 0),
    };
  }
}
