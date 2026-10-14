import {
  specificationSchema,
  type Complexity,
  type Severity,
  type Specification,
  type TestType,
} from '@devpilot/shared';
import type { FieldErrors, Resolver } from 'react-hook-form';

/** useFieldArray necesita objetos: cada texto de una lista va envuelto. */
export interface Line {
  value: string;
}

export interface TaskValues {
  title: string;
  description: string;
}

/** La especificación tal y como la edita el formulario. */
export interface EditorValues {
  title: string;
  assumptions: Line[];
  technicalDescription: string;
  userStories: {
    asA: string;
    iWant: string;
    soThat: string;
    acceptanceCriteria: Line[];
  }[];
  tasks: { frontend: TaskValues[]; backend: TaskValues[] };
  risks: { description: string; severity: Severity; mitigation: string }[];
  edgeCases: Line[];
  testCases: { title: string; type: TestType; steps: Line[]; expectedResult: string }[];
  complexity: { size: Complexity; rationale: string };
}

const lines = (texts: string[]): Line[] => texts.map((value) => ({ value }));
const texts = (items: Line[]): string[] => items.map((item) => item.value);

export function toEditorValues(spec: Specification): EditorValues {
  return {
    title: spec.title,
    assumptions: lines(spec.assumptions),
    technicalDescription: spec.technicalDescription,
    userStories: spec.userStories.map((story) => ({
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      acceptanceCriteria: lines(story.acceptanceCriteria),
    })),
    tasks: {
      frontend: spec.tasks.frontend.map((task) => ({ ...task })),
      backend: spec.tasks.backend.map((task) => ({ ...task })),
    },
    risks: spec.risks.map((risk) => ({ ...risk })),
    edgeCases: lines(spec.edgeCases),
    testCases: spec.testCases.map((test) => ({ ...test, steps: lines(test.steps) })),
    complexity: { ...spec.complexity },
  };
}

export function toSpecification(values: EditorValues): Specification {
  return {
    schemaVersion: 1,
    title: values.title,
    assumptions: texts(values.assumptions),
    technicalDescription: values.technicalDescription,
    userStories: values.userStories.map((story) => ({
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      acceptanceCriteria: texts(story.acceptanceCriteria),
    })),
    tasks: values.tasks,
    risks: values.risks,
    edgeCases: texts(values.edgeCases),
    testCases: values.testCases.map((test) => ({ ...test, steps: texts(test.steps) })),
    complexity: values.complexity,
  };
}

/** Listas de textos: en el formulario cada elemento es `{ value }`. */
const LINE_LISTS = new Set(['assumptions', 'edgeCases', 'acceptanceCriteria', 'steps']);

/**
 * La ruta de un error del esquema en el formulario: `assumptions.0` pasa a ser
 * `assumptions.0.value`, y un error de una lista entera va a su `root`.
 */
export function formPath(path: readonly PropertyKey[], arrays: ReadonlySet<string>): string[] {
  const result = path.map(String);
  const last = result.at(-1);
  const beforeLast = result.at(-2);
  if (last !== undefined && /^\d+$/.test(last) && beforeLast && LINE_LISTS.has(beforeLast)) {
    return [...result, 'value'];
  }
  if (last !== undefined && arrays.has(last)) return [...result, 'root'];
  return result;
}

const ARRAY_FIELDS = new Set([
  'assumptions',
  'userStories',
  'acceptanceCriteria',
  'frontend',
  'backend',
  'risks',
  'edgeCases',
  'testCases',
  'steps',
]);

function setNested(target: Record<string, unknown>, path: string[], value: unknown): void {
  let node = target;
  path.slice(0, -1).forEach((key) => {
    node[key] ??= {};
    node = node[key] as Record<string, unknown>;
  });
  const last = path.at(-1);
  if (last !== undefined && node[last] === undefined) node[last] = value;
}

/**
 * Valida con el mismo esquema que la respuesta de la IA (RF-EDI-02). El mensaje de cada
 * error es un código de FIELD_ERRORS, que el editor traduce.
 */
export const specificationResolver: Resolver<EditorValues, unknown, Specification> = (values) => {
  const parsed = specificationSchema.safeParse(toSpecification(values));
  if (parsed.success) return { values: parsed.data, errors: {} };

  const errors: Record<string, unknown> = {};
  for (const issue of parsed.error.issues) {
    setNested(errors, formPath(issue.path, ARRAY_FIELDS), {
      type: issue.code,
      message: issue.message,
    });
  }
  return { values: {}, errors: errors as FieldErrors<EditorValues> };
};
