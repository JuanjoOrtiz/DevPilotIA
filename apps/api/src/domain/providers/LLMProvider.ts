/**
 * Qué forma debe tener la respuesta: en la primera llamada el modelo puede preguntar o
 * especificar; en la segunda, con las respuestas, solo especificar (RF-GEN-09).
 */
export type ResponseShape = 'questions-or-specification' | 'specification';

export interface LLMRequest {
  /** Instrucciones fijas: nunca llevan texto del usuario (SEG-11). */
  system: string;
  /** Los datos de la petición, delimitados como dato. */
  prompt: string;
  shape: ResponseShape;
  /** Tiempo máximo de esta llamada. */
  timeoutMs: number;
}

export interface LLMResult {
  /** El texto tal cual: el caso de uso lo valida, nunca se confía en él. */
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

/**
 * Un modelo de lenguaje. Las implementaciones traducen sus fallos a `LLMError`
 * con uno de los códigos de docs/ai-contract.md.
 */
export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResult>;
}
