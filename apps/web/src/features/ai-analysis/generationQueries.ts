import type {
  AnswerClarificationRequest,
  CreateGenerationRequest,
  GenerationDetail,
} from '@devpilot/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as generationService from '../../services/generationService';
import { projectKeys } from '../projects/projectQueries';

/** Cada cuánto se consulta una generación en curso (docs/ai-contract.md). */
export const POLL_INTERVAL_MS = 2_000;

export const generationKeys = {
  detail: (generationId: string) => ['generations', 'detail', generationId] as const,
};

/**
 * Una generación. Mientras está en `generating` se vuelve a pedir cada 2 segundos; en
 * cualquier otro estado ya no cambia sola y se deja de consultar (RF-GEN-04).
 */
export function useGeneration(generationId: string) {
  return useQuery({
    queryKey: generationKeys.detail(generationId),
    queryFn: ({ signal }) => generationService.getGeneration(generationId, signal),
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? POLL_INTERVAL_MS : false,
  });
}

/** El proyecto y su historial cambian con cada generación nueva. */
function refreshProject(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  return queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
}

export function useCreateGeneration(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGenerationRequest) =>
      generationService.createGeneration(projectId, input),
    onSuccess: (generation) => {
      queryClient.setQueryData(generationKeys.detail(generation.id), generation);
      return refreshProject(queryClient, projectId);
    },
  });
}

/** RF-GEN-05 y RF-GEN-06: una generación nueva con la misma entrada que otra. */
export function useRetryGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (generation: GenerationDetail) =>
      generationService.createGeneration(generation.projectId, {
        type: generation.type,
        inputText: generation.inputText,
        ...(generation.additionalContext && { additionalContext: generation.additionalContext }),
      }),
    onSuccess: (generation) => {
      queryClient.setQueryData(generationKeys.detail(generation.id), generation);
      return refreshProject(queryClient, generation.projectId);
    },
  });
}

export function useAnswerClarification(generationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AnswerClarificationRequest) =>
      generationService.answerClarification(generationId, input),
    // La respuesta ya trae la generación en `generating`: la consulta empieza a sondear.
    onSuccess: (generation) =>
      queryClient.setQueryData(generationKeys.detail(generationId), generation),
  });
}
