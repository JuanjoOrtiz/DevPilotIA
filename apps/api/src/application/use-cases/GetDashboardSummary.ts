import {
  COMPLEXITIES,
  DASHBOARD_ACTIVITY_DAYS,
  type DashboardDay,
  type DashboardSummary,
} from '@devpilot/shared';
import type { Clock } from '../../domain/providers/Clock.js';
import type { DashboardRepository } from '../../domain/repositories/DashboardRepository.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` del día UTC de una fecha. */
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Indicadores y series del dashboard (RF-DAS-01 a 03). La actividad cubre los últimos
 * 30 días UTC, hoy incluido, con los días sin generaciones a cero.
 */
export class GetDashboardSummary {
  private readonly dashboard: DashboardRepository;
  private readonly clock: Clock;

  constructor(dashboard: DashboardRepository, clock: Clock) {
    this.dashboard = dashboard;
    this.clock = clock;
  }

  async execute(userId: string): Promise<DashboardSummary> {
    const now = this.clock.now();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const firstDay = new Date(today - (DASHBOARD_ACTIVITY_DAYS - 1) * DAY_MS);

    const [totals, dates] = await Promise.all([
      this.dashboard.totalsForUser(userId),
      this.dashboard.creationDatesForUser(userId, firstDay),
    ]);

    const perDay = new Map<string, number>();
    for (const date of dates) {
      const day = utcDay(date);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const activity: DashboardDay[] = Array.from({ length: DASHBOARD_ACTIVITY_DAYS }, (_, i) => {
      const date = utcDay(new Date(firstDay.getTime() + i * DAY_MS));
      return { date, count: perDay.get(date) ?? 0 };
    });

    return {
      totals: {
        projects: totals.projects,
        generations: totals.generations,
        features: totals.features,
        bugs: totals.bugs,
        completed: totals.completed,
        failed: totals.failed,
        completionRate: totals.generations > 0 ? totals.completed / totals.generations : null,
        averageDurationMs:
          totals.averageDurationMs === null ? null : Math.round(totals.averageDurationMs),
      },
      activity,
      complexity: COMPLEXITIES.map((size) => ({
        size,
        count: totals.completedByComplexity[size] ?? 0,
      })),
    };
  }
}
