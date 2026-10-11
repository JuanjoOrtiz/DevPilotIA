import type { GenerationSummary } from '../entities/Generation.js';

export interface PageRequest {
  /** Empieza en 1. */
  page: number;
  pageSize: number;
}

export interface GenerationPage {
  items: GenerationSummary[];
  /** Generaciones del proyecto en total, no solo las de esta página. */
  total: number;
}

export interface GenerationRepository {
  /**
   * Una página del historial de un proyecto, de más reciente a más antigua. Filtra por el
   * usuario además de por el proyecto: de un proyecto ajeno no devuelve nada (RNF-06).
   */
  pageForProject(userId: string, projectId: string, request: PageRequest): Promise<GenerationPage>;
}
