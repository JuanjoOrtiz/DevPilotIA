import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router';
import i18n, { LANGUAGES } from '../src/i18n';
import '../src/styles/global.css';

/** Cambia el idioma de las historias desde la barra de herramientas. */
const withLanguage: Decorator = (Story, context) => {
  const language = String(context.globals.locale ?? 'es');
  // Se cambia antes de pintar para que la historia salga ya en el idioma elegido.
  if (i18n.language !== language) void i18n.changeLanguage(language);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return <Story />;
};

/** Los enlaces necesitan un router; en las historias no navegan a ningún sitio. */
const withRouter: Decorator = (Story) => (
  <MemoryRouter>
    <Story />
  </MemoryRouter>
);

const preview: Preview = {
  decorators: [withLanguage, withRouter],
  globalTypes: {
    locale: {
      description: 'Idioma de la interfaz',
      toolbar: {
        title: 'Idioma',
        icon: 'globe',
        items: LANGUAGES.map((language) => ({ value: language.code, title: language.label })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'es' },
  parameters: {
    controls: { expanded: true },
    // RNF-10: cualquier fallo de accesibilidad se marca en el panel de la historia.
    a11y: { test: 'error' },
    layout: 'padded',
  },
};

export default preview;
