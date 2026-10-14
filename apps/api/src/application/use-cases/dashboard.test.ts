import { describe, expect, it } from 'vitest';
import { GetDashboardSummary } from './GetDashboardSummary.js';
import {
  FixedClock,
  InMemoryDashboardRepository,
  InMemoryGenerationRepository,
  InMemoryProjectRepository,
} from '../../test-support/fakes.js';
import { portal } from '../../test-support/projectFixture.js';

const LUCIA = 'user-lucia';
const MARCOS = 'user-marcos';
const DAY_MS = 24 * 60 * 60 * 1000;

function setUp() {
  // 2026-10-11T10:00:00Z: la actividad va del 12 de septiembre al 11 de octubre.
  const clock = new FixedClock();
  const generations = new InMemoryGenerationRepository(clock);
  const projects = new InMemoryProjectRepository(clock, generations);
  const summary = new GetDashboardSummary(
    new InMemoryDashboardRepository(projects, generations),
    clock,
  );
  const daysAgo = (days: number) => new Date(clock.now().getTime() - days * DAY_MS);
  return { clock, generations, projects, summary, daysAgo };
}

// RF-DAS-01 a 03
describe('GetDashboardSummary', () => {
  it('counts projects and generations, the completion rate and the average time', async () => {
    const { generations, projects, summary } = setUp();
    const portalProject = await projects.create(LUCIA, portal);
    await projects.create(LUCIA, { ...portal, name: 'App de reservas' });
    generations.add(portalProject, { complexity: 'S' }, { durationMs: 10_000 });
    generations.add(portalProject, { complexity: 'M' }, { durationMs: 14_000 });
    generations.add(portalProject, { type: 'bug', complexity: 'M' }, { durationMs: 6_000 });
    generations.add(portalProject, { type: 'bug', status: 'failed', complexity: null });
    // Las de ejemplo cuentan en los totales, pero no en el tiempo medio.
    generations.add(portalProject, { isSample: true, complexity: 'XL' }, { durationMs: 1 });

    const result = await summary.execute(LUCIA);

    expect(result.totals).toEqual({
      projects: 2,
      generations: 5,
      features: 3,
      bugs: 2,
      completed: 4,
      failed: 1,
      completionRate: 0.8,
      averageDurationMs: 10_000,
    });
    expect(result.complexity).toEqual([
      { size: 'S', count: 1 },
      { size: 'M', count: 2 },
      { size: 'L', count: 0 },
      { size: 'XL', count: 1 },
    ]);
  });

  it('returns 30 days of activity ending today, with empty days at zero', async () => {
    const { generations, projects, summary, daysAgo } = setUp();
    const project = await projects.create(LUCIA, portal);
    generations.add(project, { createdAt: daysAgo(0) });
    generations.add(project, { createdAt: daysAgo(0) });
    generations.add(project, { createdAt: daysAgo(29) });
    // Fuera de la ventana.
    generations.add(project, { createdAt: daysAgo(30) });

    const { activity } = await summary.execute(LUCIA);

    expect(activity).toHaveLength(30);
    expect(activity[0]).toEqual({ date: '2026-09-12', count: 1 });
    expect(activity[29]).toEqual({ date: '2026-10-11', count: 2 });
    expect(activity.reduce((sum, day) => sum + day.count, 0)).toBe(3);
  });

  it('counts a generation in the UTC day it was created', async () => {
    const { generations, projects, summary } = setUp();
    const project = await projects.create(LUCIA, portal);
    generations.add(project, { createdAt: new Date('2026-10-10T23:59:59.999Z') });
    generations.add(project, { createdAt: new Date('2026-10-11T00:00:00.000Z') });

    const { activity } = await summary.execute(LUCIA);

    expect(activity.at(-2)).toEqual({ date: '2026-10-10', count: 1 });
    expect(activity.at(-1)).toEqual({ date: '2026-10-11', count: 1 });
  });

  it('gives null rates and zero counts to an account without generations', async () => {
    const { summary } = setUp();

    const result = await summary.execute(LUCIA);

    expect(result.totals).toMatchObject({
      projects: 0,
      generations: 0,
      completionRate: null,
      averageDurationMs: null,
    });
    expect(result.activity.every((day) => day.count === 0)).toBe(true);
    expect(result.complexity.every((size) => size.count === 0)).toBe(true);
  });

  it("never counts someone else's projects or generations", async () => {
    const { generations, projects, summary } = setUp();
    const theirs = await projects.create(MARCOS, portal);
    generations.add(theirs);

    const result = await summary.execute(LUCIA);

    expect(result.totals.projects).toBe(0);
    expect(result.totals.generations).toBe(0);
  });

  // RF-DAS-04
  it('lists the five projects with more generations, without the empty ones', async () => {
    const { generations, projects, summary } = setUp();
    const counts = [3, 1, 6, 2, 5, 4, 0];
    for (const [index, count] of counts.entries()) {
      const project = await projects.create(LUCIA, { ...portal, name: `Proyecto ${index}` });
      for (let i = 0; i < count; i += 1) generations.add(project);
    }

    const result = await summary.execute(LUCIA);

    expect(result.projects.map((project) => [project.name, project.count])).toEqual([
      ['Proyecto 2', 6],
      ['Proyecto 4', 5],
      ['Proyecto 5', 4],
      ['Proyecto 0', 3],
      ['Proyecto 3', 2],
    ]);
  });
});
