import {
  createProjectRequestSchema,
  pageQuerySchema,
  updateProjectRequestSchema,
  type GenerationPageResponse,
  type ProjectListResponse,
  type ProjectResponse,
} from '@devpilot/shared';
import type { RequestHandler } from 'express';
import type { CreateProject } from '../../application/use-cases/CreateProject.js';
import type { DeleteProject } from '../../application/use-cases/DeleteProject.js';
import type { GetProject } from '../../application/use-cases/GetProject.js';
import type { ListProjectGenerations } from '../../application/use-cases/ListProjectGenerations.js';
import type { ListProjects } from '../../application/use-cases/ListProjects.js';
import type { UpdateProject } from '../../application/use-cases/UpdateProject.js';
import { authenticatedUserId } from '../http/authentication.js';
import { parseBody, parseQuery } from '../validators/parseBody.js';
import { parseResourceId } from '../validators/parseResourceId.js';

export interface ProjectUseCases {
  listProjects: ListProjects;
  createProject: CreateProject;
  getProject: GetProject;
  updateProject: UpdateProject;
  deleteProject: DeleteProject;
  listProjectGenerations: ListProjectGenerations;
}

export interface ProjectController {
  list: RequestHandler;
  create: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  listGenerations: RequestHandler;
}

/** Todas las rutas trabajan con el usuario del access token, nunca con uno que llegue en la petición. */
export function createProjectController(useCases: ProjectUseCases): ProjectController {
  return {
    list: async (_req, res) => {
      const body: ProjectListResponse = {
        projects: await useCases.listProjects.execute(authenticatedUserId(res)),
      };
      res.json(body);
    },

    create: async (req, res) => {
      const input = parseBody(createProjectRequestSchema, req.body);
      const body: ProjectResponse = {
        project: await useCases.createProject.execute(authenticatedUserId(res), input),
      };
      res.status(201).json(body);
    },

    get: async (req, res) => {
      const projectId = parseResourceId(req.params.id);
      const body: ProjectResponse = {
        project: await useCases.getProject.execute(authenticatedUserId(res), projectId),
      };
      res.json(body);
    },

    update: async (req, res) => {
      const projectId = parseResourceId(req.params.id);
      const input = parseBody(updateProjectRequestSchema, req.body);
      const body: ProjectResponse = {
        project: await useCases.updateProject.execute(authenticatedUserId(res), projectId, input),
      };
      res.json(body);
    },

    remove: async (req, res) => {
      const projectId = parseResourceId(req.params.id);
      await useCases.deleteProject.execute(authenticatedUserId(res), projectId);
      res.status(204).end();
    },

    listGenerations: async (req, res) => {
      const projectId = parseResourceId(req.params.id);
      const page = parseQuery(pageQuerySchema, req.query);
      const body: GenerationPageResponse = await useCases.listProjectGenerations.execute(
        authenticatedUserId(res),
        projectId,
        page,
      );
      res.json(body);
    },
  };
}
