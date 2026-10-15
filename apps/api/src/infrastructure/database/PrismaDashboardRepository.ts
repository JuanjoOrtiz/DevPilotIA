import type { Complexity, DashboardProject } from '@devpilot/shared';
import type {
  DashboardRepository,
  DashboardScope,
  DashboardTotalsData,
} from '../../domain/repositories/DashboardRepository.js';
import type { PrismaClient } from './prismaClient.js';

/** Las generaciones del usuario que entran en el filtro del dashboard. */
function generationsIn(userId: string, scope: DashboardScope) {
  return {
    project: { userId },
    createdAt: { gte: scope.since },
    ...(scope.projectId && { projectId: scope.projectId }),
  };
}

/** Agregados del dashboard en la base de datos: se cuentan filas, no se leen especificaciones. */
export class PrismaDashboardRepository implements DashboardRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async totalsForUser(userId: string, scope: DashboardScope): Promise<DashboardTotalsData> {
    const mine = generationsIn(userId, scope);

    const [projects, byType, byStatus, duration, byComplexity] = await this.prisma.$transaction([
      this.prisma.project.count({
        where: {
          userId,
          ...(scope.projectId && { id: scope.projectId }),
          generations: { some: { createdAt: { gte: scope.since } } },
        },
      }),
      this.prisma.generation.groupBy({
        by: ['type'],
        where: mine,
        orderBy: { type: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.generation.groupBy({
        by: ['status'],
        where: mine,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.generation.aggregate({
        where: { ...mine, status: 'completed', isSample: false, durationMs: { gt: 0 } },
        _avg: { durationMs: true },
      }),
      this.prisma.generation.groupBy({
        by: ['complexity'],
        where: { ...mine, status: 'completed', complexity: { not: null } },
        orderBy: { complexity: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const total = (group: { _count: { _all: number } } | undefined) => group?._count._all ?? 0;

    const completedByComplexity: Partial<Record<Complexity, number>> = {};
    for (const group of byComplexity) {
      if (group.complexity) completedByComplexity[group.complexity] = total(group);
    }

    const features = total(byType.find((group) => group.type === 'feature'));
    const bugs = total(byType.find((group) => group.type === 'bug'));

    return {
      projects,
      generations: features + bugs,
      features,
      bugs,
      completed: total(byStatus.find((group) => group.status === 'completed')),
      failed: total(byStatus.find((group) => group.status === 'failed')),
      averageDurationMs: duration._avg.durationMs ?? null,
      completedByComplexity,
    };
  }

  async topProjectsForUser(
    userId: string,
    scope: DashboardScope,
    limit: number,
  ): Promise<DashboardProject[]> {
    const groups = await this.prisma.generation.groupBy({
      by: ['projectId'],
      where: generationsIn(userId, scope),
      orderBy: { _count: { projectId: 'desc' } },
      _count: { projectId: true },
      take: limit,
    });
    const names = await this.prisma.project.findMany({
      where: { userId, id: { in: groups.map((group) => group.projectId) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(names.map((project) => [project.id, project.name]));
    return groups
      .map((group) => ({
        projectId: group.projectId,
        name: nameOf.get(group.projectId) ?? '',
        count: group._count.projectId,
      }))
      .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  async creationDatesForUser(userId: string, scope: DashboardScope): Promise<Date[]> {
    const rows = await this.prisma.generation.findMany({
      where: generationsIn(userId, scope),
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt);
  }
}
