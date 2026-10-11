/** Un proyecto: el contexto que acompaña a todas sus generaciones. Siempre es de un usuario. */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  techStack: string[];
  conventions: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Un proyecto junto con lo que se calcula a partir de sus generaciones. */
export interface ProjectOverview extends Project {
  generationCount: number;
  lastGenerationAt: Date | null;
}

/** Última actividad: lo más reciente entre la última generación y la última edición. */
export function lastActivityAt(project: ProjectOverview): Date {
  const { lastGenerationAt, updatedAt } = project;
  return lastGenerationAt && lastGenerationAt > updatedAt ? lastGenerationAt : updatedAt;
}
