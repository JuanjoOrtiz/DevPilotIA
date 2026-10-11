import type {
  GenerationPage,
  GenerationRepository,
  PageRequest,
} from '../../domain/repositories/GenerationRepository.js';
import type { PrismaClient } from './prismaClient.js';

/** Las columnas del historial. La especificación (JSON) no se lee para pintar una lista. */
const SUMMARY = {
  id: true,
  projectId: true,
  type: true,
  status: true,
  title: true,
  inputText: true,
  complexity: true,
  editedAt: true,
  isSample: true,
  createdAt: true,
} as const;

export class PrismaGenerationRepository implements GenerationRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async pageForProject(
    userId: string,
    projectId: string,
    { page, pageSize }: PageRequest,
  ): Promise<GenerationPage> {
    const where = { projectId, project: { userId } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.generation.findMany({
        where,
        select: SUMMARY,
        // El id desempata dos generaciones creadas en el mismo milisegundo.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.generation.count({ where }),
    ]);

    return { items, total };
  }
}
