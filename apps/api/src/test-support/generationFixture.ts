import { GenerationRunner, type Wait } from '../application/services/GenerationRunner.js';
import { AnswerClarification } from '../application/use-cases/AnswerClarification.js';
import { CreateGeneration, type DailyLimits } from '../application/use-cases/CreateGeneration.js';
import { GetGeneration } from '../application/use-cases/GetGeneration.js';
import type { LLMProvider } from '../domain/providers/LLMProvider.js';
import { FixedClock, InMemoryGenerationRepository, InMemoryProjectRepository } from './fakes.js';
import { InlineBackgroundTasks, ScriptedLLMProvider } from './llm.js';

export interface GenerationFixtureOptions {
  clock?: FixedClock;
  llm?: LLMProvider;
  limits?: Partial<DailyLimits>;
  projects?: InMemoryProjectRepository;
  generations?: InMemoryGenerationRepository;
}

/** Los casos de uso de generación sobre dobles en memoria y un modelo con respuestas fijas. */
export function createGenerationFixture(options: GenerationFixtureOptions = {}) {
  const clock = options.clock ?? new FixedClock();
  const generations = options.generations ?? new InMemoryGenerationRepository(clock);
  const projects = options.projects ?? new InMemoryProjectRepository(clock, generations);
  const llm = options.llm ?? new ScriptedLLMProvider();
  const background = new InlineBackgroundTasks();
  const waits: number[] = [];
  const wait: Wait = (milliseconds) => {
    waits.push(milliseconds);
    clock.advance(milliseconds);
    return Promise.resolve();
  };
  const failures: string[] = [];

  const runner = new GenerationRunner({
    llm,
    generations,
    clock,
    timeouts: { attemptMs: 20_000, totalMs: 45_000 },
    wait,
    reportFailure: (failure) => failures.push(failure.code),
  });
  const limits: DailyLimits = { perUser: 20, global: 200, ...options.limits };

  return {
    clock,
    llm,
    background,
    projects,
    generations,
    waits,
    failures,
    createGeneration: new CreateGeneration({
      projects,
      generations,
      runner,
      background,
      clock,
      limits,
    }),
    getGeneration: new GetGeneration(generations, clock),
    answerClarification: new AnswerClarification({
      projects,
      generations,
      runner,
      background,
      clock,
    }),
  };
}
