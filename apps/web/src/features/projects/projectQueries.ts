import type { CreateProjectRequest, Project, UpdateProjectRequest } from '@devpilot/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as projectService from '../../services/projectService';

/** Claves de caché. El historial cuelga del proyecto: lo que invalida a uno, invalida al otro. */
export const projectKeys = {
  list: () => ['projects', 'list'] as const,
  detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  generations: (projectId: string, page: number) =>
    [...projectKeys.detail(projectId), 'generations', page] as const,
};

/** La lista se vuelve a pedir, pero solo ella: sus páginas de detalle no han cambiado. */
function refreshList(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: projectKeys.list(), exact: true });
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: ({ signal }) => projectService.listProjects(signal),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: ({ signal }) => projectService.getProject(projectId, signal),
  });
}

export function useProjectGenerations(projectId: string, page: number, enabled = true) {
  return useQuery({
    queryKey: projectKeys.generations(projectId, page),
    queryFn: ({ signal }) => projectService.listProjectGenerations(projectId, page, signal),
    enabled,
    // Al cambiar de página se sigue viendo la anterior hasta que llega la nueva,
    // siempre que sea del mismo proyecto.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === projectId ? previous : undefined,
  });
}

/** RF-PRO-01: el proyecto nuevo aparece en la lista sin recargar la página. */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectRequest) => projectService.createProject(input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      queryClient.setQueryData<Project[]>(projectKeys.list(), (projects) =>
        projects ? [project, ...projects] : undefined,
      );
      return refreshList(queryClient);
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectRequest) => projectService.updateProject(projectId, input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(projectId), project);
      return refreshList(queryClient);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectService.deleteProject(projectId),
    onSuccess: (_result, projectId) => {
      queryClient.setQueryData<Project[]>(projectKeys.list(), (projects) =>
        projects?.filter((project) => project.id !== projectId),
      );
      return refreshList(queryClient);
    },
  });
}
