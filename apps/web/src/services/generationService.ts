import {
  generationResponseSchema,
  translationResponseSchema,
  type AnswerClarificationRequest,
  type CreateGenerationRequest,
  type GenerationDetail,
  type SpecLanguage,
  type Specification,
} from '@devpilot/shared';
import i18n from '../i18n';
import { apiDownload, apiRequest } from './apiClient';
import { saveFile } from './download';

/** La especificación se escribe en el idioma que tiene la interfaz al pedirla. */
function currentLanguage(): SpecLanguage {
  return i18n.resolvedLanguage === 'en' ? 'en' : 'es';
}

/** RF-GEN-01: lanza una generación. La API responde 202 sin esperar al modelo. */
export async function createGeneration(
  projectId: string,
  input: Omit<CreateGenerationRequest, 'language'>,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(
    `/projects/${encodeURIComponent(projectId)}/generations`,
    {
      method: 'POST',
      body: { ...input, language: currentLanguage() },
      schema: generationResponseSchema,
    },
  );
  return generation;
}

/** RF-GEN-04 y RF-HIS-03: estado y especificación de una generación. */
export async function getGeneration(
  generationId: string,
  signal?: AbortSignal,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(`/generations/${encodeURIComponent(generationId)}`, {
    schema: generationResponseSchema,
    ...(signal ? { signal } : {}),
  });
  return generation;
}

/** RF-GEN-09: respuestas a las preguntas aclaratorias, o seguir sin ellas. */
export async function answerClarification(
  generationId: string,
  input: AnswerClarificationRequest,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(
    `/generations/${encodeURIComponent(generationId)}/answers`,
    {
      method: 'POST',
      body: { ...input, language: currentLanguage() },
      schema: generationResponseSchema,
    },
  );
  return generation;
}

/**
 * RF-EXP-01: descarga la especificación vigente en Markdown. Los títulos del fichero van
 * en el idioma de la interfaz.
 */
export async function exportGeneration(generationId: string): Promise<void> {
  const query = new URLSearchParams({ format: 'md', language: currentLanguage() });
  const file = await apiDownload(
    `/generations/${encodeURIComponent(generationId)}/export?${query.toString()}`,
    'specification.md',
  );
  saveFile(file.content, file.fileName);
}

/**
 * La especificación en otro idioma. La API la traduce con el modelo la primera vez y la
 * guarda, así que las siguientes peticiones responden al momento.
 */
export async function getTranslation(
  generationId: string,
  language: SpecLanguage,
  signal?: AbortSignal,
): Promise<Specification> {
  const { translation } = await apiRequest(
    `/generations/${encodeURIComponent(generationId)}/translation?language=${language}`,
    { schema: translationResponseSchema, ...(signal ? { signal } : {}) },
  );
  return translation.specification;
}
