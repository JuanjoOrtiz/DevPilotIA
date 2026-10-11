import { z } from 'zod';
import { fieldError } from './validation.js';

/** Límites de un proyecto (RF-PRO-01). El contexto del proyecto entra en el prompt (SEG-13). */
export const PROJECT_LIMITS = {
  name: 80,
  description: 500,
  conventions: 2000,
  tags: 15,
  tagLength: 30,
} as const;

/** Quita las etiquetas repetidas, sin distinguir mayúsculas, y conserva la primera. */
function withoutDuplicates(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const name = z
  .string(fieldError('PROJECT_NAME_REQUIRED'))
  .trim()
  .min(1, fieldError('PROJECT_NAME_REQUIRED'))
  .max(PROJECT_LIMITS.name, fieldError('PROJECT_NAME_TOO_LONG'));

const description = z
  .string(fieldError('DESCRIPTION_TOO_LONG'))
  .trim()
  .max(PROJECT_LIMITS.description, fieldError('DESCRIPTION_TOO_LONG'));

const conventions = z
  .string(fieldError('CONVENTIONS_TOO_LONG'))
  .trim()
  .max(PROJECT_LIMITS.conventions, fieldError('CONVENTIONS_TOO_LONG'));

const tag = z
  .string(fieldError('TAG_EMPTY'))
  .trim()
  .min(1, fieldError('TAG_EMPTY'))
  .max(PROJECT_LIMITS.tagLength, fieldError('TAG_TOO_LONG'));

const techStack = z
  .array(tag, fieldError('TOO_MANY_TAGS'))
  .transform(withoutDuplicates)
  .pipe(z.array(z.string()).max(PROJECT_LIMITS.tags, fieldError('TOO_MANY_TAGS')));

/** Cuerpo de `POST /projects`. Solo el nombre es obligatorio. */
export const createProjectRequestSchema = z.object({
  name,
  description: description.default(''),
  techStack: techStack.default([]),
  conventions: conventions.default(''),
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

/** Cuerpo de `PATCH /projects/:id`: los campos que cambian, con las mismas reglas (RF-PRO-04). */
export const updateProjectRequestSchema = z.object({
  name: name.optional(),
  description: description.optional(),
  techStack: techStack.optional(),
  conventions: conventions.optional(),
});
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

/** Un proyecto tal y como lo devuelve la API, con lo que la lista necesita (RF-PRO-02). */
export const projectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  conventions: z.string(),
  generationCount: z.number().int().nonnegative(),
  /** Lo más reciente entre la última generación y la última edición del proyecto. */
  lastActivityAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectResponseSchema = z.object({ project: projectSchema });
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const projectListResponseSchema = z.object({ projects: z.array(projectSchema) });
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
