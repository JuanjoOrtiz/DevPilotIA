import {
  generationPageResponseSchema,
  projectListResponseSchema,
  projectResponseSchema,
  type CreateProjectRequest,
  type GenerationPageResponse,
  type Project,
  type UpdateProjectRequest,
} from '@devpilot/shared';
import { apiRequest } from './apiClient';

const path = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;

/** RF-PRO-02: los proyectos del usuario, primero el de actividad más reciente. */
export async function listProjects(signal?: AbortSignal): Promise<Project[]> {
  const { projects } = await apiRequest('/projects', {
    schema: projectListResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return projects;
}

/** RF-PRO-03. */
export async function getProject(projectId: string, signal?: AbortSignal): Promise<Project> {
  const { project } = await apiRequest(path(projectId), {
    schema: projectResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return project;
}

/** RF-PRO-01. */
export async function createProject(input: CreateProjectRequest): Promise<Project> {
  const { project } = await apiRequest('/projects', {
    method: 'POST',
    body: input,
    schema: projectResponseSchema,
  });
  return project;
}

/** RF-PRO-04. */
export async function updateProject(
  projectId: string,
  input: UpdateProjectRequest,
): Promise<Project> {
  const { project } = await apiRequest(path(projectId), {
    method: 'PATCH',
    body: input,
    schema: projectResponseSchema,
  });
  return project;
}

/** RF-PRO-05: elimina el proyecto y sus generaciones. */
export async function deleteProject(projectId: string): Promise<void> {
  await apiRequest(path(projectId), { method: 'DELETE' });
}

/** RF-HIS-01: una página del historial, de más reciente a más antigua. */
export function listProjectGenerations(
  projectId: string,
  page: number,
  signal?: AbortSignal,
): Promise<GenerationPageResponse> {
  return apiRequest(`${path(projectId)}/generations?page=${page}`, {
    schema: generationPageResponseSchema,
    ...(signal ? { signal } : {}),
  });
}
