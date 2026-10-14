import type { SpecLanguage } from '@devpilot/shared';
import { useTranslation } from 'react-i18next';

/** El idioma de la interfaz como idioma de especificación. Cambia al pulsar ES/EN. */
export function useSpecLanguage(): SpecLanguage {
  const { i18n } = useTranslation();
  return (i18n.resolvedLanguage ?? i18n.language) === 'en' ? 'en' : 'es';
}
