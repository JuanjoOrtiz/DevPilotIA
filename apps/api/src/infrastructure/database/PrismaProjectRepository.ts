import type { Project, ProjectOverview } from '../../domain/entities/Project.js';
import type {
  ProjectData,
  ProjectRepository,
} from '../../domain/repositories/ProjectRepository.js';
import type { PrismaClient } from './prismaClient.js';

/** Lo que se lee junto al proyecto: cuántas generaciones tiene y cuándo se creó la última. */
const WITH_ACTIVITY = {
  _count: { select: { generations: true } },
  generations: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
} as const;

interface ProjectWithActivity extends Project {
  _count: { generations: number };
  generations: { createdAt: Date }[];
}

function toOverview(row: ProjectWithActivity): ProjectOverview {
  const { _count, generations, ...project } = row;
  return {
    ...project,
    generationCount: _count.generations,
    lastGenerationAt: generations[0]?.createdAt ?? null,
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listForUser(userId: string): Promise<ProjectOverview[]> {
    const rows = await this.prisma.project.findMany({ where: { userId }, include: WITH_ACTIVITY });
    return rows.map(toOverview);
  }

  async findForUser(userId: string, projectId: string): Promise<ProjectOverview | null> {
    const row = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: WITH_ACTIVITY,
    });
    return row ? toOverview(row) : null;
  }

  create(userId: string, data: ProjectData): Promise<Project> {
    return this.prisma.project.create({ data: { ...data, userId } });
  }

  async updateForUser(
    userId: string,
    projectId: string,
    changes: Partial<ProjectData>,
  ): Promise<ProjectOverview | null> {
    // El usuario va en la condición del UPDATE: un proyecto ajeno no cambia ni una fila.
    const { count } = await this.prisma.project.updateMany({
      where: { id: projectId, userId },
      data: changes,
    });
    return count === 1 ? this.findForUser(userId, projectId) : null;
  }

  async deleteForUser(userId: string, projectId: string): Promise<boolean> {
    // Las generaciones se van con el proyecto por la clave ajena (ON DELETE CASCADE).
    const { count } = await this.prisma.project.deleteMany({ where: { id: projectId, userId } });
    return count === 1;
  }
}
