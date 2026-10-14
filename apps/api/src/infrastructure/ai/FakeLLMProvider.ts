import type {
  ClarifyingQuestion,
  Complexity,
  FinalModelResponse,
  FirstModelResponse,
  Specification,
} from '@devpilot/shared';
import type { LLMProvider, LLMRequest, LLMResult } from '../../domain/providers/LLMProvider.js';

export const FAKE_MODEL = 'fake-llm';

/** Por debajo de esta longitud, la primera llamada devuelve preguntas en vez de especificar. */
export const FAKE_QUESTIONS_BELOW = 80;

interface PromptData {
  project: { name: string; techStack: string[]; conventions: string };
  request: { type: 'feature' | 'bug'; description: string; additionalContext: string | null };
  clarifications?: { question: string; answer: string | null }[];
}

export interface FakeLLMOptions {
  /** Espera antes de responder, para ver los estados de la interfaz en local. */
  latencyMs?: number;
}

interface TranslationData {
  outputLanguage: string;
  specification: Specification;
}

/** Lee los datos que GenerationPrompt o TranslationPrompt ponen entre `<data>` y `</data>`. */
function readData(prompt: string): PromptData | TranslationData {
  const match = /<data>\n([\s\S]*?)\n<\/data>/.exec(prompt);
  if (!match?.[1]) throw new Error('The prompt has no <data> block');
  return JSON.parse(match[1]) as PromptData | TranslationData;
}

/**
 * «Traducción» simulada: marca los textos principales con el idioma, sin tocar la
 * estructura. Basta para ver en local que la interfaz cambia de versión.
 */
function translate({ outputLanguage, specification }: TranslationData): Specification {
  const tag = `[${outputLanguage.slice(0, 2).toUpperCase()}]`;
  const mark = (text: string, max: number) => `${tag} ${text}`.slice(0, max);
  return {
    ...specification,
    title: mark(specification.title, 120),
    technicalDescription: mark(specification.technicalDescription, 4000),
    assumptions: specification.assumptions.map((text) => mark(text, 600)),
    edgeCases: specification.edgeCases.map((text) => mark(text, 600)),
  };
}

const SPANISH = /[áéíóúñ¿¡]|\b(el|la|los|las|que|de|para|con|una?)\b/i;

function texts(spanish: boolean) {
  return spanish
    ? {
        q1: '¿A qué usuarios afecta y en qué pantalla ocurre?',
        why1: 'Define el alcance de las historias de usuario.',
        q2: '¿Cuál es el comportamiento esperado exactamente?',
        why2: 'Determina los criterios de aceptación y los casos de prueba.',
        noAnswer: (q: string) => `Sin respuesta a «${q}»: se asume el caso más habitual.`,
        asA: 'usuario de la aplicación',
        soThat: 'pueda completar mi trabajo sin bloqueos',
        criterion: 'El comportamiento descrito funciona en los navegadores soportados',
        frontend: 'Interfaz',
        backend: 'Lógica de servidor',
        uses: (stack: string) => `Implementarlo con ${stack}.`,
        risk: 'Regresiones en funcionalidades relacionadas',
        mitigation: 'Tests automáticos antes de desplegar',
        edge: 'Entrada vacía o con caracteres especiales',
        test: 'Flujo principal',
        step: 'Reproducir el escenario descrito',
        expected: 'El resultado coincide con los criterios de aceptación',
        rationale: 'Estimación del modelo simulado según la longitud de la descripción.',
      }
    : {
        q1: 'Which users are affected and on which screen?',
        why1: 'It sets the scope of the user stories.',
        q2: 'What exactly is the expected behaviour?',
        why2: 'It drives the acceptance criteria and the test cases.',
        noAnswer: (q: string) => `No answer to "${q}": the most common case is assumed.`,
        asA: 'user of the application',
        soThat: 'I can finish my work without getting blocked',
        criterion: 'The described behaviour works in the supported browsers',
        frontend: 'Interface',
        backend: 'Server logic',
        uses: (stack: string) => `Build it with ${stack}.`,
        risk: 'Regressions in related features',
        mitigation: 'Automated tests before deploying',
        edge: 'Empty input or special characters',
        test: 'Main flow',
        step: 'Reproduce the described scenario',
        expected: 'The result matches the acceptance criteria',
        rationale: 'Estimate from the fake model based on the description length.',
      };
}

function sizeFor(description: string): Complexity {
  if (description.length < 150) return 'S';
  if (description.length < 400) return 'M';
  if (description.length < 1000) return 'L';
  return 'XL';
}

/** Primeras palabras de la descripción, como título. */
function titleFrom(description: string): string {
  const words = description.replace(/\s+/g, ' ').trim().split(' ').slice(0, 10).join(' ');
  return words.length > 120 ? `${words.slice(0, 117)}…` : words;
}

function specification(data: PromptData): Specification {
  const { description } = data.request;
  const t = texts(SPANISH.test(description));
  const stack = data.project.techStack.join(', ');

  const assumptions = (data.clarifications ?? [])
    .filter((item) => !item.answer)
    .map((item) => t.noAnswer(item.question))
    .slice(0, 6);

  return {
    schemaVersion: 1,
    title: titleFrom(description),
    assumptions,
    technicalDescription: [description, stack ? t.uses(stack) : '', data.project.conventions]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 4000),
    userStories: [
      {
        asA: t.asA,
        iWant: description.slice(0, 600),
        soThat: t.soThat,
        acceptanceCriteria: [t.criterion],
      },
    ],
    tasks: {
      frontend: [{ title: t.frontend, description: stack ? t.uses(stack) : t.frontend }],
      backend: [{ title: t.backend, description: stack ? t.uses(stack) : t.backend }],
    },
    risks: [{ description: t.risk, severity: 'medium', mitigation: t.mitigation }],
    edgeCases: [t.edge],
    testCases: [{ title: t.test, type: 'e2e', steps: [t.step], expectedResult: t.expected }],
    complexity: { size: sizeFor(description), rationale: t.rationale },
  };
}

function questions(description: string): ClarifyingQuestion[] {
  const t = texts(SPANISH.test(description));
  return [
    { id: 'q1', question: t.q1, why: t.why1 },
    { id: 'q2', question: t.q2, why: t.why2 },
  ];
}

/**
 * Modelo simulado para trabajar en local sin clave y para el CI. Es determinista: con una
 * descripción corta pregunta y, si no, especifica usando el stack del proyecto.
 */
export class FakeLLMProvider implements LLMProvider {
  private readonly latencyMs: number;

  constructor(options: FakeLLMOptions = {}) {
    this.latencyMs = options.latencyMs ?? 0;
  }

  async generate(request: LLMRequest): Promise<LLMResult> {
    if (this.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    const read = readData(request.prompt);
    if ('specification' in read) {
      return this.result(request, { kind: 'specification', specification: translate(read) });
    }
    const data = read;
    const ask =
      request.shape === 'questions-or-specification' &&
      data.request.description.length < FAKE_QUESTIONS_BELOW;

    const response: FirstModelResponse | FinalModelResponse = ask
      ? { kind: 'questions', questions: questions(data.request.description) }
      : { kind: 'specification', specification: specification(data) };
    return this.result(request, response);
  }

  private result(
    request: LLMRequest,
    response: FirstModelResponse | FinalModelResponse,
  ): LLMResult {
    const text = JSON.stringify(response);

    return {
      text,
      model: FAKE_MODEL,
      inputTokens: Math.ceil(request.prompt.length / 4),
      outputTokens: Math.ceil(text.length / 4),
    };
  }
}
