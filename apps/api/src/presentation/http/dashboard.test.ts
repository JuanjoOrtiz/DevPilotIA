import { apiErrorSchema, dashboardResponseSchema, projectResponseSchema } from '@devpilot/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { lucia } from '../../test-support/authFixture.js';
import { portal } from '../../test-support/projectFixture.js';
import { createTestApp } from '../../test-support/testApp.js';

// RF-DAS-01 a 03
describe('GET /api/v1/dashboard/summary', () => {
  it("answers with the user's indicators and series", async () => {
    const { app, projects } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);
    const authorization = `Bearer ${(registered.body as { accessToken: string }).accessToken}`;
    const created = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', authorization)
      .send(portal);
    const project = projectResponseSchema.parse(created.body).project;
    const stored = projects.repository.projects.find((p) => p.id === project.id);
    if (!stored) throw new Error('Project not stored');
    projects.generations.add(stored, { complexity: 'L' }, { durationMs: 8_000 });

    const response = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    const { summary } = dashboardResponseSchema.parse(response.body);
    expect(summary.totals).toMatchObject({
      projects: 1,
      generations: 1,
      completed: 1,
      completionRate: 1,
      averageDurationMs: 8_000,
    });
    expect(summary.activity.at(-1)?.count).toBe(1);
    expect(summary.complexity).toContainEqual({ size: 'L', count: 1 });
  });

  it('answers 401 without a session', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/v1/dashboard/summary');

    expect(response.status).toBe(401);
    expect(apiErrorSchema.parse(response.body).error.code).toBe('UNAUTHORIZED');
  });

  // RF-DAS-06
  it('answers 400 for a period that is not offered or a project id that is not a UUID', async () => {
    const { app } = createTestApp();
    const registered = await request(app).post('/api/v1/auth/register').send(lucia);
    const authorization = `Bearer ${(registered.body as { accessToken: string }).accessToken}`;
    const get = (query: string) =>
      request(app).get(`/api/v1/dashboard/summary?${query}`).set('Authorization', authorization);

    expect((await get('days=45')).status).toBe(400);
    expect((await get('projectId=nope')).status).toBe(400);
    const week = await get('days=7');
    expect(dashboardResponseSchema.parse(week.body).summary.activity).toHaveLength(7);
  });
});
