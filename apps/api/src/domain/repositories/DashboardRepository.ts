import type { Complexity, DashboardProject } from '@devpilot/shared';

/** Recuentos de lo que entra en el filtro, para los indicadores del dashboard. */
export interface DashboardTotalsData {
  projects: number;
  generations: number;
  features: number;
  bugs: number;
  completed: number;
  failed: number;
  /** Media del tiempo con el modelo de las completadas, sin las de ejemplo. */
  averageDurationMs: number | null;
  /** Completadas por complejidad. Una complejidad sin generaciones puede no aparecer. */
  completedByComplexity: Partial<Record<Complexity, number>>;
}

/** Qué generaciones cuentan: las creadas desde `since` y, si se indica, de un proyecto. */
export interface DashboardScope {
  since: Date;
  projectId?: string | undefined;
}

/** Lecturas agregadas del dashboard. Como el resto, filtran siempre por el usuario. */
export interface DashboardRepository {
  totalsForUser(userId: string, scope: DashboardScope): Promise<DashboardTotalsData>;

  /** Los proyectos con más generaciones, de más a menos; sin los que no tienen ninguna. */
  topProjectsForUser(
    userId: string,
    scope: DashboardScope,
    limit: number,
  ): Promise<DashboardProject[]>;

  /** Fecha de creación de cada generación del usuario que entra en `scope`. */
  creationDatesForUser(userId: string, scope: DashboardScope): Promise<Date[]>;
}
