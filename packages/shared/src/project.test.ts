import { describe, expect, it } from 'vitest';
import {
  createProjectRequestSchema,
  PROJECT_LIMITS,
  updateProjectRequestSchema,
} from './project.js';
import { FIELD_ERRORS, pageQuerySchema } from './validation.js';

function errors(schema: typeof createProjectRequestSchema, input: unknown): string[] {
  const parsed = schema.safeParse(input);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
}

// RF-PRO-01
describe('createProjectRequestSchema', () => {
  it('needs only a name and fills in the rest', () => {
    expect(createProjectRequestSchema.parse({ name: '  Portal de clientes ' })).toEqual({
      name: 'Portal de clientes',
      description: '',
      techStack: [],
      conventions: '',
    });
  });

  it('trims the tags and drops the repeated ones, whatever their case', () => {
    const parsed = createProjectRequestSchema.parse({
      name: 'API',
      techStack: [' React ', 'Node.js', 'react', 'NODE.JS', 'PostgreSQL'],
    });

    expect(parsed.techStack).toEqual(['React', 'Node.js', 'PostgreSQL']);
  });

  it('enforces the limit of each field', () => {
    const base = { name: 'API' };
    const many = Array.from({ length: PROJECT_LIMITS.tags + 1 }, (_, index) => `tag-${index}`);

    expect(errors(createProjectRequestSchema, { name: ' ' })).toEqual(['PROJECT_NAME_REQUIRED']);
    expect(errors(createProjectRequestSchema, {})).toEqual(['PROJECT_NAME_REQUIRED']);
    expect(errors(createProjectRequestSchema, { name: 'x'.repeat(81) })).toEqual([
      'PROJECT_NAME_TOO_LONG',
    ]);
    expect(errors(createProjectRequestSchema, { ...base, description: 'x'.repeat(501) })).toEqual([
      'DESCRIPTION_TOO_LONG',
    ]);
    expect(errors(createProjectRequestSchema, { ...base, conventions: 'x'.repeat(2001) })).toEqual([
      'CONVENTIONS_TOO_LONG',
    ]);
    expect(errors(createProjectRequestSchema, { ...base, techStack: many })).toEqual([
      'TOO_MANY_TAGS',
    ]);
    expect(errors(createProjectRequestSchema, { ...base, techStack: ['x'.repeat(31)] })).toEqual([
      'TAG_TOO_LONG',
    ]);
    expect(errors(createProjectRequestSchema, { ...base, techStack: ['React', '  '] })).toEqual([
      'TAG_EMPTY',
    ]);
  });

  it('accepts every field at its limit', () => {
    const parsed = createProjectRequestSchema.safeParse({
      name: 'x'.repeat(80),
      description: 'x'.repeat(500),
      conventions: 'x'.repeat(2000),
      techStack: Array.from({ length: 15 }, (_, index) => `${'t'.repeat(28)}${index + 10}`),
    });

    expect(parsed.success).toBe(true);
  });

  it('counts the tags after dropping the repeated ones', () => {
    const repeated = Array.from({ length: 30 }, (_, index) => `tag-${index % 10}`);

    expect(
      createProjectRequestSchema.parse({ name: 'API', techStack: repeated }).techStack,
    ).toHaveLength(10);
  });

  it('only uses known field error codes', () => {
    const messages = errors(createProjectRequestSchema, {
      name: 5,
      description: 5,
      techStack: 'React',
      conventions: [],
    });

    expect(messages.length).toBe(4);
    expect(messages.filter((message) => !FIELD_ERRORS.includes(message as never))).toEqual([]);
  });
});

// RF-PRO-04: mismas validaciones que al crear.
describe('updateProjectRequestSchema', () => {
  it('keeps only the fields that were sent, without inventing defaults', () => {
    expect(updateProjectRequestSchema.parse({ description: ' Nueva ' })).toEqual({
      description: 'Nueva',
    });
    expect(updateProjectRequestSchema.parse({})).toEqual({});
  });

  it('applies the same rules as creation', () => {
    expect(updateProjectRequestSchema.safeParse({ name: ' ' }).success).toBe(false);
    expect(updateProjectRequestSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false);
    expect(updateProjectRequestSchema.safeParse({ techStack: ['x'.repeat(31)] }).success).toBe(
      false,
    );
  });
});

describe('pageQuerySchema', () => {
  it('defaults to the first page of ten', () => {
    expect(pageQuerySchema.parse({})).toEqual({ page: 1, pageSize: 10 });
  });

  it('reads the numbers from a query string and bounds them', () => {
    expect(pageQuerySchema.parse({ page: '3', pageSize: '25' })).toEqual({ page: 3, pageSize: 25 });
    expect(pageQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('explains an invalid page with codes, like any other field', () => {
    const parsed = pageQuerySchema.safeParse({ page: ['1', '2'], pageSize: '2.5' });

    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)).toEqual([
      'PAGE_INVALID',
      'PAGE_SIZE_INVALID',
    ]);
  });
});
