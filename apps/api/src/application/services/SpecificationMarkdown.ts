import type {
  Complexity,
  GenerationType,
  Severity,
  SpecLanguage,
  Specification,
  TestType,
} from '@devpilot/shared';

interface Labels {
  type: Record<GenerationType, string>;
  complexityLabel: string;
  assumptions: string;
  technical: string;
  stories: string;
  story: (index: number) => string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string;
  tasks: string;
  frontend: string;
  backend: string;
  noTasks: string;
  risks: string;
  severity: Record<Severity, string>;
  mitigation: string;
  noRisks: string;
  edgeCases: string;
  noEdgeCases: string;
  tests: string;
  testType: Record<TestType, string>;
  steps: string;
  expected: string;
  noTests: string;
  complexity: string;
  size: Record<Complexity, string>;
}

/** Títulos del fichero en el idioma de la interfaz. El contenido ya viene escrito. */
const LABELS: Record<SpecLanguage, Labels> = {
  es: {
    type: { feature: 'Funcionalidad', bug: 'Bug' },
    complexityLabel: 'Complejidad',
    assumptions: 'Supuestos',
    technical: 'Descripción técnica',
    stories: 'Historias de usuario',
    story: (index) => `Historia ${index}`,
    asA: 'Como',
    iWant: 'quiero',
    soThat: 'para',
    criteria: 'Criterios de aceptación',
    tasks: 'Tareas',
    frontend: 'Frontend',
    backend: 'Backend',
    noTasks: 'Sin tareas.',
    risks: 'Riesgos y casos límite',
    severity: { low: 'baja', medium: 'media', high: 'alta' },
    mitigation: 'Mitigación',
    noRisks: 'Sin riesgos identificados.',
    edgeCases: 'Casos límite',
    noEdgeCases: 'Sin casos límite.',
    tests: 'Casos de prueba',
    testType: { unit: 'unitaria', integration: 'integración', e2e: 'E2E' },
    steps: 'Pasos',
    expected: 'Resultado esperado',
    noTests: 'Sin casos de prueba.',
    complexity: 'Estimación de complejidad',
    size: {
      S: 'horas',
      M: 'uno o dos días',
      L: 'hasta una semana',
      XL: 'más de una semana: conviene dividirla',
    },
  },
  en: {
    type: { feature: 'Feature', bug: 'Bug' },
    complexityLabel: 'Complexity',
    assumptions: 'Assumptions',
    technical: 'Technical description',
    stories: 'User stories',
    story: (index) => `Story ${index}`,
    asA: 'As a',
    iWant: 'I want',
    soThat: 'so that',
    criteria: 'Acceptance criteria',
    tasks: 'Tasks',
    frontend: 'Frontend',
    backend: 'Backend',
    noTasks: 'No tasks.',
    risks: 'Risks and edge cases',
    severity: { low: 'low', medium: 'medium', high: 'high' },
    mitigation: 'Mitigation',
    noRisks: 'No risks identified.',
    edgeCases: 'Edge cases',
    noEdgeCases: 'No edge cases.',
    tests: 'Test cases',
    testType: { unit: 'unit', integration: 'integration', e2e: 'E2E' },
    steps: 'Steps',
    expected: 'Expected result',
    noTests: 'No test cases.',
    complexity: 'Complexity estimate',
    size: {
      S: 'hours',
      M: 'one or two days',
      L: 'up to a week',
      XL: 'more than a week: consider splitting it',
    },
  },
};

/** Un texto dentro de un elemento de lista: sin saltos de línea que rompan la lista. */
function inline(text: string): string {
  return text.replace(/\s*\n+\s*/g, ' ').trim();
}

function list(items: string[], empty: string, prefix = '- '): string[] {
  return items.length > 0 ? items.map((item) => `${prefix}${inline(item)}`) : [`_${empty}_`];
}

/**
 * La especificación en Markdown (RF-EXP-01): las seis secciones y, delante, los supuestos.
 * Las tareas y los criterios de aceptación son listas de casillas para seguirlas en un
 * ticket o en un pull request.
 */
export function specificationToMarkdown(
  specification: Specification,
  type: GenerationType,
  language: SpecLanguage,
): string {
  const l = LABELS[language];
  const lines: string[] = [];
  const section = (title: string, ...body: string[]) => lines.push(`## ${title}`, '', ...body, '');

  lines.push(
    `# ${inline(specification.title)}`,
    '',
    `> ${l.type[type]} · ${l.complexityLabel}: ${specification.complexity.size}`,
    '',
  );

  if (specification.assumptions.length > 0) {
    section(l.assumptions, ...list(specification.assumptions, ''));
  }

  section(l.technical, specification.technicalDescription.trim());

  const stories = specification.userStories.flatMap((story, index) => [
    `### ${l.story(index + 1)}`,
    '',
    `**${l.asA}** ${inline(story.asA)}, **${l.iWant}** ${inline(story.iWant)}, **${l.soThat}** ${inline(story.soThat)}.`,
    '',
    `**${l.criteria}**`,
    '',
    ...list(story.acceptanceCriteria, '', '- [ ] '),
    '',
  ]);
  section(l.stories, ...stories.slice(0, -1));

  const tasks = (title: string, items: Specification['tasks']['frontend']) => [
    `### ${title}`,
    '',
    ...list(
      items.map((task) => `**${task.title}**: ${task.description}`),
      l.noTasks,
      '- [ ] ',
    ),
  ];
  section(
    l.tasks,
    ...tasks(l.frontend, specification.tasks.frontend),
    '',
    ...tasks(l.backend, specification.tasks.backend),
  );

  section(
    l.risks,
    ...list(
      specification.risks.map(
        (risk) =>
          `**${risk.description}** (${l.severity[risk.severity]}). ${l.mitigation}: ${risk.mitigation}`,
      ),
      l.noRisks,
    ),
    '',
    `### ${l.edgeCases}`,
    '',
    ...list(specification.edgeCases, l.noEdgeCases),
  );

  const tests =
    specification.testCases.length > 0
      ? specification.testCases.flatMap((test) => [
          `### ${inline(test.title)} (${l.testType[test.type]})`,
          '',
          `${l.steps}:`,
          '',
          ...test.steps.map((step, index) => `${index + 1}. ${inline(step)}`),
          '',
          `${l.expected}: ${inline(test.expectedResult)}`,
          '',
        ])
      : [`_${l.noTests}_`, ''];
  section(l.tests, ...tests.slice(0, -1));

  section(
    l.complexity,
    `**${specification.complexity.size}** (${l.size[specification.complexity.size]}). ${inline(specification.complexity.rationale)}`,
  );

  return `${lines.join('\n').trimEnd()}\n`;
}

/** Nombre del fichero: el título en minúsculas, solo con letras ASCII, números y guiones. */
export function exportFileName(title: string, extension: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return `${slug || 'specification'}.${extension}`;
}
