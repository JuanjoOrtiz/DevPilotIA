/** Rutas de la aplicación, en un solo sitio para no repetirlas como texto. */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  projects: '/projects',
  newProject: '/projects/new',
  project: (projectId: string) => `/projects/${projectId}`,
  editProject: (projectId: string) => `/projects/${projectId}/edit`,
  newGeneration: (projectId: string) => `/projects/${projectId}/generations/new`,
  generation: (generationId: string) => `/generations/${generationId}`,
} as const;

/** Las mismas rutas con parámetros, tal y como las declara el router. */
export const ROUTE_PATTERNS = {
  project: ROUTES.project(':projectId'),
  editProject: ROUTES.editProject(':projectId'),
  newGeneration: ROUTES.newGeneration(':projectId'),
  generation: ROUTES.generation(':generationId'),
} as const;
