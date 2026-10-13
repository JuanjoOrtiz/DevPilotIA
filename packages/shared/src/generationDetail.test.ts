import { describe, expect, it } from 'vitest';
import {
  answerClarificationRequestSchema,
  createGenerationRequestSchema,
  GENERATION_INPUT_LIMITS,
} from './generationDetail.js';

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? []);
}

// RF-GEN-01 y SEG-13
describe('createGenerationRequestSchema', () => {
  it('trims the text and treats an empty additional context as none', () => {
    expect(
      createGenerationRequestSchema.parse({
        type: 'bug',
        inputText: '  El login falla con contraseñas que llevan tildes  ',
        additionalContext: '   ',
      }),
    ).toEqual({
      type: 'bug',
      inputText: 'El login falla con contraseñas que llevan tildes',
      additionalContext: null,
    });
  });

  it('rejects descriptions shorter than 20 or longer than 4,000 characters', () => {
    const short = createGenerationRequestSchema.safeParse({ type: 'feature', inputText: 'corto' });
    const long = createGenerationRequestSchema.safeParse({
      type: 'feature',
      inputText: 'a'.repeat(GENERATION_INPUT_LIMITS.inputMax + 1),
    });

    expect(messages(short)).toEqual(['INPUT_TOO_SHORT']);
    expect(messages(long)).toEqual(['INPUT_TOO_LONG']);
  });

  it('rejects an unknown type and a context over 2,000 characters', () => {
    const result = createGenerationRequestSchema.safeParse({
      type: 'epic',
      inputText: 'Quiero exportar el historial de pedidos a CSV',
      additionalContext: 'x'.repeat(GENERATION_INPUT_LIMITS.additionalContext + 1),
    });

    expect(messages(result).toSorted()).toEqual(['CONTEXT_TOO_LONG', 'GENERATION_TYPE_INVALID']);
  });
});

// RF-GEN-09
describe('answerClarificationRequestSchema', () => {
  it('accepts answers, blank ones included, or skip', () => {
    expect(
      answerClarificationRequestSchema.parse({
        answers: [
          { questionId: 'q1', answer: ' Solo en Safari ' },
          { questionId: 'q2', answer: '' },
        ],
      }),
    ).toEqual({
      answers: [
        { questionId: 'q1', answer: 'Solo en Safari' },
        { questionId: 'q2', answer: '' },
      ],
    });
    expect(answerClarificationRequestSchema.parse({ skip: true })).toEqual({ skip: true });
  });

  it('rejects an answer over 500 characters and a body with neither shape', () => {
    expect(
      answerClarificationRequestSchema.safeParse({
        answers: [{ questionId: 'q1', answer: 'a'.repeat(501) }],
      }).success,
    ).toBe(false);
    expect(answerClarificationRequestSchema.safeParse({ skip: false }).success).toBe(false);
    expect(answerClarificationRequestSchema.safeParse({}).success).toBe(false);
  });
});
