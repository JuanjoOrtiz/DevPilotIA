import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  ErrorCode,
  GenerationType,
  Specification,
} from '@devpilot/shared';
import type { Generation, GenerationSummary, GenerationUsage } from '../entities/Generation.js';

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

export interface NewGeneration {
  type: GenerationType;
  inputText: string;
  additionalContext: string | null;
}

/**
 * Las lecturas y los cambios que pide el usuario filtran por él además de por el
 * recurso: lo ajeno se comporta como lo que no existe (RNF-06). Los que terminan una
 * generación (`complete`, `requestClarification`, `fail`) los usa el trabajo en segundo
 * plano, que ya ha comprobado el dueño, y solo cambian una generación en `generating`.
 */
export interface GenerationRepository {
  /** Una página del historial de un proyecto, de más reciente a más antigua. */
  pageForProject(userId: string, projectId: string, request: PageRequest): Promise<GenerationPage>;

  /** Crea la generación en `generating`. El proyecto ya se ha comprobado. */
  create(projectId: string, data: NewGeneration): Promise<Generation>;

  findForUser(userId: string, generationId: string): Promise<Generation | null>;

  /** Generaciones del usuario creadas desde `since`, sin contar las de ejemplo. */
  countForUserSince(userId: string, since: Date): Promise<number>;

  /** Generaciones de todos los usuarios creadas desde `since`, sin contar las de ejemplo. */
  countAllSince(since: Date): Promise<number>;

  /**
   * Guarda las respuestas y vuelve a `generating`, solo si la generación espera respuestas.
   * Devuelve `false` si no: así dos envíos a la vez no lanzan dos generaciones.
   */
  saveAnswers(
    userId: string,
    generationId: string,
    answers: ClarificationAnswer[],
    at: Date,
  ): Promise<boolean>;

  complete(
    generationId: string,
    specification: Specification,
    usage: GenerationUsage,
    at: Date,
  ): Promise<void>;

  requestClarification(
    generationId: string,
    questions: ClarifyingQuestion[],
    usage: GenerationUsage,
  ): Promise<void>;

  fail(generationId: string, code: ErrorCode, usage: GenerationUsage): Promise<void>;

  /** Marca como fallida una generación del usuario que lleva generándose desde antes de `before`. */
  failIfStale(userId: string, generationId: string, before: Date): Promise<boolean>;
}
