import type {
  AnswerClarificationRequest,
  CreateGenerationRequest,
  ExportFormat,
  GenerationDetail,
  SpecLanguage,
  UpdateSpecificationRequest,
} from '@devpilot/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as generationService from '../../services/generationService';
import { dashboardKeys } from '../dashboard/dashboardQueries';
import { projectKeys } from '../projects/projectQueries';

/** Cada cuánto se consulta una generación en curso (docs/ai-contract.md). */
export const POLL_INTERVAL_MS = 2_000;

export const generationKeys = {
  detail: (generationId: string) => ['generations', 'detail', generationId] as const,
  translation: (generationId: string, language: SpecLanguage, edited: boolean) =>
    ['generations', 'translation', generationId, language, edited] as const,
};

/**
 * La especificación en el idioma de la interfaz, si no es el suyo. Solo se pide con la
 * especificación ya generada; una vez traducida no cambia, así que no se vuelve a pedir.
 * Sin reintentos automáticos: cada intento es una llamada al modelo.
 */
export function useSpecificationTranslation(generation: GenerationDetail, language: SpecLanguage) {
  const needed =
    generation.status === 'completed' &&
    generation.specification !== null &&
    generation.language !== language;

  return useQuery({
    queryKey: generationKeys.translation(generation.id, language, generation.isEdited),
    queryFn: ({ signal }) => generationService.getTranslation(generation.id, language, signal),
    enabled: needed,
    staleTime: Infinity,
    retry: false,
  });
}

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
    mutationFn: (input: Omit<CreateGenerationRequest, 'language'>) =>
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

/** RF-EXP-01 y 02: descarga la especificación vigente en Markdown o en JSON. */
export function useExportGeneration(generationId: string) {
  return useMutation({
    mutationFn: (format: ExportFormat) => generationService.exportGeneration(generationId, format),
  });
}

/** RF-EXP-03: copia el Markdown al portapapeles. */
export function useCopyMarkdown(generationId: string) {
  return useMutation({ mutationFn: () => generationService.copyMarkdown(generationId) });
}

/** El historial del proyecto y el dashboard cambian con cada generación que se edita o borra. */
function refreshLists(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  return Promise.all([
    refreshProject(queryClient, projectId),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.summary() }),
  ]);
}

/** RF-EDI-02: guarda la edición; la página vuelve a mostrar la generación ya editada. */
export function useUpdateSpecification(generation: GenerationDetail) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSpecificationRequest) =>
      generationService.updateSpecification(generation.id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(generationKeys.detail(updated.id), updated);
      return refreshLists(queryClient, updated.projectId);
    },
  });
}

/**
 * RF-EDI-03: vuelve a la versión de la IA. Las traducciones de la edición ya no valen y
 * la API las ha borrado: se olvidan también aquí.
 */
export function useRestoreOriginal(generation: GenerationDetail) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generationService.restoreOriginal(generation.id),
    onSuccess: (restored) => {
      queryClient.removeQueries({ queryKey: ['generations', 'translation', restored.id] });
      queryClient.setQueryData(generationKeys.detail(restored.id), restored);
      return refreshLists(queryClient, restored.projectId);
    },
  });
}

/** RF-GEN-06: una generación nueva con la misma entrada; la original se conserva. */
export function useRegenerateGeneration(generation: GenerationDetail) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generationService.regenerateGeneration(generation.id),
    onSuccess: (created) => {
      queryClient.setQueryData(generationKeys.detail(created.id), created);
      return refreshLists(queryClient, created.projectId);
    },
  });
}

/** RF-HIS-04. */
export function useDeleteGeneration(generation: GenerationDetail) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generationService.deleteGeneration(generation.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: generationKeys.detail(generation.id) });
      return refreshLists(queryClient, generation.projectId);
    },
  });
}
