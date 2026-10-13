import { quotaErrorDetailsSchema } from '@devpilot/shared';
import type { TFunction } from 'i18next';
import type { SubmitFailure } from '../forms/submitFailure';
import { errorMessageKey } from '../../i18n/messages';

/**
 * Texto de un fallo al lanzar una generación. Si es un límite diario, dice cuál es y
 * cuándo se reinicia (RF-GEN-07); si no, el mensaje de su código.
 */
export function generationFailureMessage(
  failure: SubmitFailure,
  t: TFunction,
  formatDateTime: (iso: string) => string,
): string {
  const quota = quotaErrorDetailsSchema.safeParse(failure.details);
  if (quota.success && failure.code === 'USER_QUOTA_EXCEEDED') {
    return t('generation.form.quota', {
      limit: quota.data.limit,
      time: formatDateTime(quota.data.resetsAt),
    });
  }
  if (quota.success && failure.code === 'GLOBAL_QUOTA_EXCEEDED') {
    return t('generation.form.globalQuota', { time: formatDateTime(quota.data.resetsAt) });
  }
  return t(errorMessageKey(failure.code));
}
