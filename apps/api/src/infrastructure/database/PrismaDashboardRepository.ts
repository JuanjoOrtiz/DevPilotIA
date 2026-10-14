import type { Complexity, DashboardProject } from '@devpilot/shared';
import type {
  DashboardRepository,
  DashboardTotalsData,
} from '../../domain/repositories/DashboardRepository.js';
import type { PrismaClient } from './prismaClient.js';

/** Agregados del dashboard en la base de datos: se cuentan filas, no se leen especificaciones. */
export class PrismaDashboardRepository implements DashboardRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async totalsForUser(userId: string): Promise<DashboardTotalsData> {
    const mine = { project: { userId } };

    const [projects, byType, byStatus, duration, byComplexity] = await this.prisma.$transaction([
      this.prisma.project.count({ where: { userId } }),
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

  async topProjectsForUser(userId: string, limit: number): Promise<DashboardProject[]> {
    const rows = await this.prisma.project.findMany({
      where: { userId, generations: { some: {} } },
      select: { id: true, name: true, _count: { select: { generations: true } } },
      orderBy: [{ generations: { _count: 'desc' } }, { name: 'asc' }],
      take: limit,
    });
    return rows.map((row) => ({
      projectId: row.id,
      name: row.name,
      count: row._count.generations,
    }));
  }

  async creationDatesForUser(userId: string, since: Date): Promise<Date[]> {
    const rows = await this.prisma.generation.findMany({
      where: { project: { userId }, createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt);
  }
}
