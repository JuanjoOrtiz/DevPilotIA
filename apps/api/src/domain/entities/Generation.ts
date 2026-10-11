import type { Complexity, GenerationStatus, GenerationType } from '@devpilot/shared';

/** Lo que el historial necesita de una generación, sin la especificación. */
export interface GenerationSummary {
  id: string;
  projectId: string;
  type: GenerationType;
  status: GenerationStatus;
  /** Lo pone la IA: no existe mientras se genera ni si la generación falla. */
  title: string | null;
  inputText: string;
  complexity: Complexity | null;
  /** Cuándo guardó el usuario su versión editada, si lo ha hecho. */
  editedAt: Date | null;
  isSample: boolean;
  createdAt: Date;
}
