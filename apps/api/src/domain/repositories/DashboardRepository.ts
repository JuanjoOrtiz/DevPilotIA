import type { Complexity } from '@devpilot/shared';

/** Recuentos de todo lo que tiene un usuario, para los indicadores del dashboard. */
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

/** Lecturas agregadas del dashboard. Como el resto, filtran siempre por el usuario. */
export interface DashboardRepository {
  totalsForUser(userId: string): Promise<DashboardTotalsData>;

  /** Fecha de creación de cada generación del usuario creada desde `since`. */
  creationDatesForUser(userId: string, since: Date): Promise<Date[]>;
}
