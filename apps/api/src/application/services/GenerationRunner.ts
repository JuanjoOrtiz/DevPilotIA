import {
  finalModelResponseSchema,
  firstModelResponseSchema,
  type ErrorCode,
  type FinalModelResponse,
  type FirstModelResponse,
} from '@devpilot/shared';
import type { GenerationUsage } from '../../domain/entities/Generation.js';
import { LLMError } from '../../domain/errors/LLMError.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { LLMProvider, ResponseShape } from '../../domain/providers/LLMProvider.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import { buildRequest, type PromptInput } from './GenerationPrompt.js';

export interface GenerationTimeouts {
  /** Tiempo máximo de una llamada al modelo (20 s). */
  attemptMs: number;
  /** Tiempo máximo de una fase entera, reintentos incluidos (45 s). */
  totalMs: number;
}

/** Espera entre reintentos tras un 429 del proveedor: hasta dos, cada vez más largos. */
export const RATE_LIMIT_BACKOFF_MS = [1_000, 3_000] as const;

/** Cuántos errores de validación se devuelven al modelo para que los corrija. */
const MAX_FEEDBACK_ISSUES = 10;

export type Wait = (milliseconds: number) => Promise<void>;

export interface GenerationRunnerDependencies {
  llm: LLMProvider;
  generations: GenerationRepository;
  clock: Clock;
  timeouts: GenerationTimeouts;
  wait: Wait;
  /** Avisa de una generación que falla por causa del proveedor (Sentry, más adelante). */
  reportFailure?: (failure: GenerationFailure) => void;
}

export interface GenerationFailure {
  generationId: string;
  code: ErrorCode;
  model: string | null;
  attempts: number;
}

type Outcome =
  { ok: true; response: FirstModelResponse | FinalModelResponse } | { ok: false; code: ErrorCode };

/**
 * Ejecuta una fase de una generación: llama al modelo, valida su respuesta y guarda el
 * resultado. Aplica la tabla de errores de docs/ai-contract.md: un reintento si la
 * respuesta no cumple el esquema o el proveedor está caído, dos con espera creciente si
 * responde 429, ninguno si hay timeout o contenido bloqueado. Nunca lanza: cualquier
 * fallo acaba en una generación `failed`.
 */
export class GenerationRunner {
  private readonly deps: GenerationRunnerDependencies;

  constructor(deps: GenerationRunnerDependencies) {
    this.deps = deps;
  }

  async run(generationId: string, input: PromptInput, shape: ResponseShape): Promise<void> {
    const usage: GenerationUsage = {
      model: null,
      attempts: 0,
      durationMs: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    const startedAt = this.deps.clock.now().getTime();

    let outcome: Outcome;
    try {
      outcome = await this.attempt(input, shape, usage, startedAt);
    } catch (error) {
      console.error('Unexpected error while generating', generationId, error);
      outcome = { ok: false, code: 'LLM_UNAVAILABLE' };
    }
    usage.durationMs = this.deps.clock.now().getTime() - startedAt;

    try {
      await this.save(generationId, outcome, usage);
    } catch (error) {
      // Si ni siquiera se puede guardar, la generación quedará como fallida al consultarla.
      console.error('Could not save the generation result', generationId, error);
    }
  }

  private async attempt(
    input: PromptInput,
    shape: ResponseShape,
    usage: GenerationUsage,
    startedAt: number,
  ): Promise<Outcome> {
    const { llm, clock, timeouts, wait } = this.deps;
    const deadline = startedAt + timeouts.totalMs;
    const remaining = () => deadline - clock.now().getTime();

    let validationFeedback: string | undefined;
    let invalidResponses = 0;
    let unavailable = 0;
    let rateLimited = 0;

    for (;;) {
      if (remaining() <= 0) return { ok: false, code: 'LLM_TIMEOUT' };

      const request = buildRequest(input, {
        shape,
        timeoutMs: Math.min(timeouts.attemptMs, remaining()),
        validationFeedback,
      });
      usage.attempts += 1;

      let text: string;
      try {
        const result = await llm.generate(request);
        usage.model = result.model;
        usage.inputTokens += result.inputTokens ?? 0;
        usage.outputTokens += result.outputTokens ?? 0;
        text = result.text;
      } catch (error) {
        if (!(error instanceof LLMError)) throw error;

        if (error.code === 'LLM_RATE_LIMITED' && rateLimited < RATE_LIMIT_BACKOFF_MS.length) {
          const delay = RATE_LIMIT_BACKOFF_MS[rateLimited] ?? 0;
          rateLimited += 1;
          if (delay >= remaining()) return { ok: false, code: 'LLM_TIMEOUT' };
          await wait(delay);
          continue;
        }
        if (error.code === 'LLM_UNAVAILABLE' && unavailable === 0) {
          unavailable += 1;
          continue;
        }
        return { ok: false, code: error.code };
      }

      const parsed = parseResponse(text, shape);
      if (parsed.ok) return { ok: true, response: parsed.response };

      invalidResponses += 1;
      if (invalidResponses > 1) return { ok: false, code: 'LLM_INVALID_RESPONSE' };
      validationFeedback = parsed.feedback;
    }
  }

  private async save(generationId: string, outcome: Outcome, usage: GenerationUsage) {
    const { generations, clock } = this.deps;

    if (!outcome.ok) {
      await generations.fail(generationId, outcome.code, usage);
      this.deps.reportFailure?.({
        generationId,
        code: outcome.code,
        model: usage.model,
        attempts: usage.attempts,
      });
      return;
    }

    const { response } = outcome;
    if (response.kind === 'questions') {
      await generations.requestClarification(generationId, response.questions, usage);
    } else {
      await generations.complete(generationId, response.specification, usage, clock.now());
    }
  }
}

type Parsed =
  { ok: true; response: FirstModelResponse | FinalModelResponse } | { ok: false; feedback: string };

/** La respuesta del modelo no es fiable: se valida contra el esquema antes de usarla. */
export function parseResponse(text: string, shape: ResponseShape): Parsed {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, feedback: '- The answer is not valid JSON.' };
  }

  const schema = shape === 'specification' ? finalModelResponseSchema : firstModelResponseSchema;
  const result = schema.safeParse(json);
  if (result.success) return { ok: true, response: result.data };

  const feedback = result.error.issues
    .slice(0, MAX_FEEDBACK_ISSUES)
    .map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  return { ok: false, feedback };
}
