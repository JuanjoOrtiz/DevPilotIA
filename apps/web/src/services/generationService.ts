import {
  generationResponseSchema,
  type AnswerClarificationRequest,
  type CreateGenerationRequest,
  type GenerationDetail,
} from '@devpilot/shared';
import { apiRequest } from './apiClient';

/** RF-GEN-01: lanza una generación. La API responde 202 sin esperar al modelo. */
export async function createGeneration(
  projectId: string,
  input: CreateGenerationRequest,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(
    `/projects/${encodeURIComponent(projectId)}/generations`,
    { method: 'POST', body: input, schema: generationResponseSchema },
  );
  return generation;
}

/** RF-GEN-04 y RF-HIS-03: estado y especificación de una generación. */
export async function getGeneration(
  generationId: string,
  signal?: AbortSignal,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(`/generations/${encodeURIComponent(generationId)}`, {
    schema: generationResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return generation;
}

/** RF-GEN-09: respuestas a las preguntas aclaratorias, o seguir sin ellas. */
export async function answerClarification(
  generationId: string,
  input: AnswerClarificationRequest,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(
    `/generations/${encodeURIComponent(generationId)}/answers`,
    { method: 'POST', body: input, schema: generationResponseSchema },
  );
  return generation;
}
