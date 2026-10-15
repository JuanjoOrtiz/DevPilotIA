import { dashboardQuerySchema, type DashboardResponse } from '@devpilot/shared';
import type { RequestHandler } from 'express';
import type { GetDashboardSummary } from '../../application/use-cases/GetDashboardSummary.js';
import { authenticatedUserId } from '../http/authentication.js';
import { parseQuery } from '../validators/parseBody.js';

export interface DashboardUseCases {
  getDashboardSummary: GetDashboardSummary;
}

export interface DashboardController {
  summary: RequestHandler;
}

export function createDashboardController(useCases: DashboardUseCases): DashboardController {
  return {
    summary: async (req, res) => {
      const filter = parseQuery(dashboardQuerySchema, req.query);
      const body: DashboardResponse = {
        summary: await useCases.getDashboardSummary.execute(authenticatedUserId(res), filter),
      };
      res.json(body);
    },
  };
}
