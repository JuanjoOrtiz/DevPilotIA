import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  ErrorCode,
  GenerationType,
  SpecLanguage,
  Specification,
} from '@devpilot/shared';
import type {
  Generation,
  GenerationSummary,
  GenerationUsage,
  SpecTranslation,
} from '../entities/Generation.js';

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
  /** Idioma en que escribirá el modelo. */
  language: SpecLanguage;
}

/** Una generación de ejemplo, ya completada, creada desde un fichero del repositorio. */
export interface NewSampleGeneration extends NewGeneration {
  specification: Specification;
  createdAt: Date;
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
    language: SpecLanguage,
  ): Promise<boolean>;

  /** Crea una generación de ejemplo completada (RF-PRO-06). No cuenta para los límites. */
  createSample(projectId: string, sample: NewSampleGeneration): Promise<Generation>;

  /**
   * Guarda la versión editada de una generación completada (RF-EDI-02) sin tocar la de la
   * IA. Descarta las traducciones guardadas. Devuelve `false` si no existe, no es del
   * usuario o no está completada.
   */
  saveEdit(
    userId: string,
    generationId: string,
    specification: Specification,
    language: SpecLanguage,
    at: Date,
  ): Promise<boolean>;

  /** Elimina una generación (RF-HIS-04). Devuelve `false` si no existe o no es del usuario. */
  deleteForUser(userId: string, generationId: string): Promise<boolean>;

  /** Guarda la traducción a un idioma, sustituyendo la que hubiera. */
  saveTranslation(
    userId: string,
    generationId: string,
    language: SpecLanguage,
    translation: SpecTranslation,
  ): Promise<void>;

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
