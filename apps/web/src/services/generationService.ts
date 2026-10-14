import {
  generationResponseSchema,
  translationResponseSchema,
  type AnswerClarificationRequest,
  type CreateGenerationRequest,
  type GenerationDetail,
  type ExportFormat,
  type SpecLanguage,
  type Specification,
  type UpdateSpecificationRequest,
} from '@devpilot/shared';
import i18n from '../i18n';
import { apiDownload, apiRequest } from './apiClient';
import { copyText } from './clipboard';
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

function exportPath(generationId: string, format: ExportFormat): string {
  const query = new URLSearchParams({ format, language: currentLanguage() });
  return `/generations/${encodeURIComponent(generationId)}/export?${query.toString()}`;
}

/**
 * RF-EXP-01 y 02: descarga la especificación vigente en Markdown o en JSON. Los títulos
 * del Markdown van en el idioma de la interfaz.
 */
export async function exportGeneration(
  generationId: string,
  format: ExportFormat = 'md',
): Promise<void> {
  const file = await apiDownload(exportPath(generationId, format), `specification.${format}`);
  saveFile(file.content, file.fileName);
}

/** RF-EXP-03: copia al portapapeles el Markdown de la especificación vigente. */
export function copyMarkdown(generationId: string): Promise<void> {
  return copyText(
    apiDownload(exportPath(generationId, 'md'), 'specification.md').then((file) =>
      file.content.text(),
    ),
  );
}

/** RF-EDI-02: guarda la versión editada, en el idioma en que se editó. */
export async function updateSpecification(
  generationId: string,
  input: UpdateSpecificationRequest,
): Promise<GenerationDetail> {
  const { generation } = await apiRequest(`/generations/${encodeURIComponent(generationId)}`, {
    method: 'PATCH',
    body: input,
    schema: generationResponseSchema,
  });
  return generation;
}

/** RF-GEN-06: una generación nueva con la misma entrada; la API responde 202. */
export async function regenerateGeneration(generationId: string): Promise<GenerationDetail> {
  const { generation } = await apiRequest(
    `/generations/${encodeURIComponent(generationId)}/regenerate`,
    { method: 'POST', body: { language: currentLanguage() }, schema: generationResponseSchema },
  );
  return generation;
}

/** RF-HIS-04. */
export async function deleteGeneration(generationId: string): Promise<void> {
  await apiRequest(`/generations/${encodeURIComponent(generationId)}`, { method: 'DELETE' });
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
