import type { ErrorCode } from '@devpilot/shared';

export type LLMErrorCode = Extract<
  ErrorCode,
  'LLM_RATE_LIMITED' | 'LLM_TIMEOUT' | 'LLM_CONTENT_BLOCKED' | 'LLM_UNAVAILABLE'
>;

/** Fallo del proveedor del modelo, ya traducido a un código de dominio. */
export class LLMError extends Error {
  readonly code: LLMErrorCode;

  constructor(code: LLMErrorCode, message: string) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
  }
}
