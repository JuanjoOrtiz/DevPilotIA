import {
  answerClarificationRequestSchema,
  createGenerationRequestSchema,
  exportGenerationQuerySchema,
  regenerateRequestSchema,
  updateSpecificationRequestSchema,
  translationQuerySchema,
  type GenerationResponse,
  type TranslationResponse,
} from '@devpilot/shared';
import type { RequestHandler } from 'express';
import type { AnswerClarification } from '../../application/use-cases/AnswerClarification.js';
import type { CreateGeneration } from '../../application/use-cases/CreateGeneration.js';
import type { DeleteGeneration } from '../../application/use-cases/DeleteGeneration.js';
import type { RegenerateGeneration } from '../../application/use-cases/RegenerateGeneration.js';
import type { RestoreOriginalSpecification } from '../../application/use-cases/RestoreOriginalSpecification.js';
import type { UpdateSpecification } from '../../application/use-cases/UpdateSpecification.js';
import type { ExportGeneration } from '../../application/use-cases/ExportGeneration.js';
import type { GetGeneration } from '../../application/use-cases/GetGeneration.js';
import type { TranslateSpecification } from '../../application/use-cases/TranslateSpecification.js';
import { authenticatedUserId } from '../http/authentication.js';
import { parseBody, parseQuery } from '../validators/parseBody.js';
import { parseResourceId } from '../validators/parseResourceId.js';

export interface GenerationUseCases {
  createGeneration: CreateGeneration;
  getGeneration: GetGeneration;
  answerClarification: AnswerClarification;
  exportGeneration: ExportGeneration;
  translateSpecification: TranslateSpecification;
  updateSpecification: UpdateSpecification;
  restoreOriginalSpecification: RestoreOriginalSpecification;
  deleteGeneration: DeleteGeneration;
  regenerateGeneration: RegenerateGeneration;
}

export interface GenerationController {
  create: RequestHandler;
  get: RequestHandler;
  answer: RequestHandler;
  export: RequestHandler;
  translation: RequestHandler;
  update: RequestHandler;
  restore: RequestHandler;
  remove: RequestHandler;
  regenerate: RequestHandler;
}

/**
 * Crear y responder devuelven 202: el trabajo con el modelo sigue en segundo plano y el
 * frontend consulta el estado con `GET /generations/:id`.
 */
export function createGenerationController(useCases: GenerationUseCases): GenerationController {
  return {
    create: async (req, res) => {
      const projectId = parseResourceId(req.params.id);
      const input = parseBody(createGenerationRequestSchema, req.body);
      const body: GenerationResponse = {
        generation: await useCases.createGeneration.execute(
          authenticatedUserId(res),
          projectId,
          input,
        ),
      };
      res.status(202).json(body);
    },

    get: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const body: GenerationResponse = {
        generation: await useCases.getGeneration.execute(authenticatedUserId(res), generationId),
      };
      res.json(body);
    },

    answer: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const input = parseBody(answerClarificationRequestSchema, req.body);
      const body: GenerationResponse = {
        generation: await useCases.answerClarification.execute(
          authenticatedUserId(res),
          generationId,
          input,
        ),
      };
      res.status(202).json(body);
    },

    update: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const input = parseBody(updateSpecificationRequestSchema, req.body);
      const body: GenerationResponse = {
        generation: await useCases.updateSpecification.execute(
          authenticatedUserId(res),
          generationId,
          input,
        ),
      };
      res.json(body);
    },

    restore: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const body: GenerationResponse = {
        generation: await useCases.restoreOriginalSpecification.execute(
          authenticatedUserId(res),
          generationId,
        ),
      };
      res.json(body);
    },

    remove: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      await useCases.deleteGeneration.execute(authenticatedUserId(res), generationId);
      res.status(204).end();
    },

    regenerate: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const { language } = parseBody(regenerateRequestSchema, req.body);
      const body: GenerationResponse = {
        generation: await useCases.regenerateGeneration.execute(
          authenticatedUserId(res),
          generationId,
          language,
        ),
      };
      res.status(202).json(body);
    },

    translation: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const { language } = parseQuery(translationQuerySchema, req.query);
      const body: TranslationResponse = {
        translation: await useCases.translateSpecification.execute(
          authenticatedUserId(res),
          generationId,
          language,
        ),
      };
      res.json(body);
    },

    export: async (req, res) => {
      const generationId = parseResourceId(req.params.id);
      const query = parseQuery(exportGenerationQuerySchema, req.query);
      const file = await useCases.exportGeneration.execute(
        authenticatedUserId(res),
        generationId,
        query,
      );
      // El nombre ya es ASCII sin comillas: no puede romper la cabecera.
      res
        .status(200)
        .type(file.contentType)
        .setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
        .send(file.content);
    },
  };
}
