import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Prohíbe importar desde las carpetas indicadas (capas o niveles) y, opcionalmente,
 * los paquetes indicados. Es la regla que hace cumplir RNF-01 y RNF-02 en el CI.
 */
function forbidImports({ folders, packages = [], reason }) {
  const patterns = [
    {
      regex: `(^|/)(${folders.join('|')})(/|$)`,
      message: reason,
    },
  ];
  if (packages.length > 0) {
    patterns.push({ group: packages, message: reason });
  }
  return { 'no-restricted-imports': ['error', { patterns }] };
}

const FRAMEWORKS = [
  'express',
  'express/*',
  'helmet',
  '@prisma/*',
  'pg',
  '@google/*',
  'bcryptjs',
  'jose',
  '@vercel/*',
  '@sentry/*',
];
const DATA_ACCESS = ['@tanstack/react-query'];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/node_modules/**',
      '**/storybook-static/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Un parámetro que empieza por _ es obligatorio por firma, aunque no se use.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.config.{js,ts}', 'apps/api/**/*.ts', 'packages/*/scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // ----------------------------------------------------------------- API
  // Clean Architecture: las dependencias apuntan siempre hacia domain.
  {
    files: ['apps/api/src/domain/**/*.ts'],
    rules: forbidImports({
      folders: ['application', 'infrastructure', 'presentation'],
      packages: FRAMEWORKS,
      reason: 'domain no depende de otras capas ni de frameworks (RNF-01).',
    }),
  },
  {
    files: ['apps/api/src/application/**/*.ts'],
    rules: forbidImports({
      folders: ['infrastructure', 'presentation'],
      packages: FRAMEWORKS,
      reason: 'application solo depende de domain (RNF-01).',
    }),
  },
  {
    files: ['apps/api/src/infrastructure/**/*.ts'],
    rules: forbidImports({
      folders: ['presentation'],
      reason: 'infrastructure no depende de presentation (RNF-01).',
    }),
  },
  {
    files: ['apps/api/src/presentation/**/*.ts'],
    rules: forbidImports({
      folders: ['infrastructure'],
      packages: ['@prisma/*', 'pg', '@google/*'],
      reason:
        'presentation no depende de infrastructure; la composición va en composition.ts (RNF-01).',
    }),
  },

  // ----------------------------------------------------------------- Web
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'El texto del usuario y la salida del LLM se muestran siempre como texto (SEG-05).',
        },
      ],
    },
  },
  // Atomic Design: un nivel solo importa niveles inferiores.
  {
    files: ['apps/web/src/components/atoms/**/*.{ts,tsx}'],
    rules: forbidImports({
      folders: ['molecules', 'organisms', 'templates', 'pages', 'features', 'services', 'hooks'],
      packages: DATA_ACCESS,
      reason: 'Un átomo es presentacional y no importa niveles superiores (RNF-02).',
    }),
  },
  {
    files: ['apps/web/src/components/molecules/**/*.{ts,tsx}'],
    rules: forbidImports({
      folders: ['organisms', 'templates', 'pages', 'features', 'services', 'hooks'],
      packages: DATA_ACCESS,
      reason: 'Una molécula es presentacional y solo importa átomos (RNF-02).',
    }),
  },
  {
    files: ['apps/web/src/components/organisms/**/*.{ts,tsx}'],
    rules: forbidImports({
      folders: ['templates', 'pages', 'services'],
      reason: 'Un organismo no importa plantillas, páginas ni servicios (RNF-02).',
    }),
  },
  {
    files: ['apps/web/src/components/templates/**/*.{ts,tsx}'],
    rules: forbidImports({
      folders: ['pages', 'features', 'services', 'hooks'],
      packages: DATA_ACCESS,
      reason: 'Una plantilla define el esqueleto, sin datos (RNF-02).',
    }),
  },
);
