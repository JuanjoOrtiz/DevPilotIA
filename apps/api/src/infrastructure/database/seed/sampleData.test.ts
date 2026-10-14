import {
  clarifyingQuestionsSchema,
  COMPLEXITIES,
  createProjectRequestSchema,
  specificationSchema,
} from '@devpilot/shared';
import { describe, expect, it } from 'vitest';
import {
  SAMPLE_GENERATIONS,
  SAMPLE_PROJECTS,
  toEditedSpecification,
  toSpecification,
} from './sampleData.js';

describe('sample data', () => {
  it('has 3 valid projects and 25 generations spread over 30 days', () => {
    expect(SAMPLE_PROJECTS).toHaveLength(3);
    for (const { key: _key, ...project } of SAMPLE_PROJECTS) {
      expect(createProjectRequestSchema.safeParse(project).success).toBe(true);
    }
    expect(SAMPLE_GENERATIONS).toHaveLength(25);
    for (const entry of SAMPLE_GENERATIONS) {
      expect(entry.daysAgo).toBeGreaterThanOrEqual(0);
      expect(entry.daysAgo).toBeLessThan(30);
      expect(SAMPLE_PROJECTS.some((project) => project.key === entry.project)).toBe(true);
    }
  });

  it('stores only specifications that pass the public schema, also the edited ones', () => {
    for (const entry of SAMPLE_GENERATIONS) {
      if (entry.status === 'needs_clarification') {
        expect(clarifyingQuestionsSchema.safeParse(entry.questions).success).toBe(true);
      }
      if (entry.status !== 'completed') continue;
      const specification = toSpecification(entry.spec);
      expect(specificationSchema.safeParse(specification).error).toBeUndefined();
      if (entry.edit) {
        const edited = toEditedSpecification(specification, entry.edit);
        expect(specificationSchema.safeParse(edited).error).toBeUndefined();
        expect(edited).not.toEqual(specification);
      }
    }
  });

  it('mixes types, statuses and every complexity, with some edited', () => {
    const statuses = new Set(SAMPLE_GENERATIONS.map((entry) => entry.status));
    const types = new Set(SAMPLE_GENERATIONS.map((entry) => entry.type));
    const completed = SAMPLE_GENERATIONS.filter((entry) => entry.status === 'completed');
    const sizes = new Set(completed.map((entry) => entry.spec.size));

    expect(statuses).toEqual(new Set(['completed', 'failed', 'needs_clarification']));
    expect(types).toEqual(new Set(['feature', 'bug']));
    expect(sizes).toEqual(new Set(COMPLEXITIES));
    expect(completed.filter((entry) => entry.edit).length).toBeGreaterThan(0);
  });
});
