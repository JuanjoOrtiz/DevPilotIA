import { z } from 'zod';
import { complexitySchema } from './generation.js';

/** Días que cubre la gráfica de actividad por defecto (RF-DAS-02), hoy incluido. */
export const DASHBOARD_ACTIVITY_DAYS = 30;

/** Periodos que se pueden elegir en el dashboard (RF-DAS-06). */
export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** Parámetros de `GET /dashboard/summary`: el periodo en días y, si se quiere, un proyecto. */
export const dashboardQuerySchema = z.object({
  days: z.coerce
    .number()
    .refine((value): value is DashboardPeriod =>
      (DASHBOARD_PERIODS as readonly number[]).includes(value),
    )
    .default(DASHBOARD_ACTIVITY_DAYS),
  projectId: z.uuid().optional(),
});
export type DashboardQuery = z.input<typeof dashboardQuerySchema>;
export type DashboardFilter = z.output<typeof dashboardQuerySchema>;

const count = z.number().int().nonnegative();

/**
 * Indicadores resumen (RF-DAS-01) del periodo y del proyecto elegidos. `projects` son los
 * proyectos con alguna generación en el periodo. Tasas y medias son `null` si no hay datos.
 */
export const dashboardTotalsSchema = z.object({
  projects: count,
  generations: count,
  features: count,
  bugs: count,
  completed: count,
  failed: count,
  /** Completadas sobre el total, entre 0 y 1. */
  completionRate: z.number().min(0).max(1).nullable(),
  /** Media del tiempo de generación de las completadas, en milisegundos. */
  averageDurationMs: count.nullable(),
});
export type DashboardTotals = z.infer<typeof dashboardTotalsSchema>;

/** Generaciones creadas un día (UTC), en formato `YYYY-MM-DD`. */
export const dashboardDaySchema = z.object({ date: z.iso.date(), count });
export type DashboardDay = z.infer<typeof dashboardDaySchema>;

/** Generaciones completadas con una complejidad (RF-DAS-03). */
export const dashboardComplexitySchema = z.object({ size: complexitySchema, count });
export type DashboardComplexity = z.infer<typeof dashboardComplexitySchema>;

/** Proyectos que más generaciones tienen (RF-DAS-04). */
export const DASHBOARD_TOP_PROJECTS = 5;

export const dashboardProjectSchema = z.object({ projectId: z.uuid(), name: z.string(), count });
export type DashboardProject = z.infer<typeof dashboardProjectSchema>;

export const dashboardSummarySchema = z.object({
  totals: dashboardTotalsSchema,
  /** Un elemento por día, del más antiguo a hoy, también los días sin actividad. */
  activity: z
    .array(dashboardDaySchema)
    .min(Math.min(...DASHBOARD_PERIODS))
    .max(Math.max(...DASHBOARD_PERIODS)),
  /** Siempre S, M, L y XL, en ese orden. */
  complexity: z.array(dashboardComplexitySchema),
  /** Hasta cinco proyectos, de más a menos generaciones; sin los que no tienen ninguna. */
  projects: z.array(dashboardProjectSchema).max(DASHBOARD_TOP_PROJECTS),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

/** Respuesta de `GET /dashboard/summary`. */
export const dashboardResponseSchema = z.object({ summary: dashboardSummarySchema });
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
