import type {
  AnswerClarificationInput,
  ClarificationAnswer,
  GenerationDetail,
} from '@devpilot/shared';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { BackgroundTasks } from '../../domain/providers/BackgroundTasks.js';
import type { Clock } from '../../domain/providers/Clock.js';
import type { GenerationRepository } from '../../domain/repositories/GenerationRepository.js';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository.js';
import { toGenerationDetailDto } from '../dto/GenerationDto.js';
import type { GenerationRunner } from '../services/GenerationRunner.js';

export interface AnswerClarificationDependencies {
  projects: ProjectRepository;
  generations: GenerationRepository;
  runner: GenerationRunner;
  background: BackgroundTasks;
  clock: Clock;
}

/**
 * Recibe las respuestas a las preguntas aclaratorias, o la orden de seguir sin ellas, y
 * lanza la segunda fase, que solo puede terminar en especificación (RF-GEN-09). No cuenta
 * para el límite diario: la generación ya se contó al crearla.
 */
export class AnswerClarification {
  private readonly deps: AnswerClarificationDependencies;

  constructor(deps: AnswerClarificationDependencies) {
    this.deps = deps;
  }

  async execute(
    userId: string,
    generationId: string,
    request: AnswerClarificationInput,
  ): Promise<GenerationDetail> {
    const { projects, generations, runner, background, clock } = this.deps;

    const generation = await generations.findForUser(userId, generationId);
    if (!generation) throw new DomainError('NOT_FOUND', 'Generation not found');

    const questions = generation.clarifyingQuestions;
    if (generation.status !== 'needs_clarification' || !questions) {
      throw new DomainError(
        'GENERATION_NOT_AWAITING_ANSWERS',
        'This generation is not waiting for answers',
      );
    }

    const given = 'skip' in request ? [] : request.answers;
    const unknown = given.filter((answer) => !questions.some((q) => q.id === answer.questionId));
    if (unknown.length > 0) {
      throw new DomainError('VALIDATION_ERROR', 'Unknown question', {
        fields: { answers: ['ANSWER_UNKNOWN_QUESTION'] },
      });
    }

    // Se guarda una respuesta por pregunta, en blanco si no la hay.
    const answers: ClarificationAnswer[] = questions.map((question) => ({
      questionId: question.id,
      answer: given.find((answer) => answer.questionId === question.id)?.answer ?? '',
    }));

    const saved = await generations.saveAnswers(userId, generationId, answers, clock.now());
    if (!saved) {
      throw new DomainError(
        'GENERATION_NOT_AWAITING_ANSWERS',
        'This generation is not waiting for answers',
      );
    }

    const project = await projects.findForUser(userId, generation.projectId);
    if (!project) throw new DomainError('NOT_FOUND', 'Generation not found');

    background.run(() =>
      runner.run(
        generationId,
        {
          project,
          type: generation.type,
          inputText: generation.inputText,
          additionalContext: generation.additionalContext,
          language: request.language,
          clarifications: { questions, answers },
        },
        'specification',
      ),
    );

    const updated = await generations.findForUser(userId, generationId);
    if (!updated) throw new DomainError('NOT_FOUND', 'Generation not found');
    return toGenerationDetailDto(updated);
  }
}
