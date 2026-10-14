import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Catálogo de componentes (RNF-18), con la jerarquía de Atomic Design. Usa la misma
 * configuración de Vite que la aplicación: los alias y los CSS Modules funcionan igual.
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  core: { disableTelemetry: true },
};

export default config;
