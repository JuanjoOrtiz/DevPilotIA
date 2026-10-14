// Proyecto de ejemplo de cada cuenta nueva (RF-PRO-06). Está escrito aquí: crearlo no
// llama al modelo. Si la interfaz está en inglés, se traduce como cualquier otra.
import type { Specification } from '@devpilot/shared';
import type { ProjectData } from '../../domain/repositories/ProjectRepository.js';

export const SAMPLE_PROJECT: ProjectData = {
  name: 'Proyecto de ejemplo: tienda online',
  description:
    'Un proyecto de muestra para ver cómo funciona DevPilot AI. Puedes editarlo, generar nuevas especificaciones o eliminarlo.',
  techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  conventions: 'Clean Architecture en el backend. Componentes con Atomic Design. Tests con Vitest.',
};

export const SAMPLE_REQUEST = {
  type: 'feature' as const,
  inputText:
    'Quiero que los clientes puedan guardar productos en una lista de favoritos para comprarlos más tarde, y que la lista se conserve entre dispositivos.',
};

export const SAMPLE_SPECIFICATION: Specification = {
  schemaVersion: 1,
  title: 'Lista de favoritos sincronizada entre dispositivos',
  assumptions: [
    'Solo los clientes con sesión iniciada pueden guardar favoritos.',
    'Un cliente puede guardar hasta 200 productos.',
  ],
  technicalDescription:
    'Nueva entidad Favorite que relaciona cliente y producto, con clave única por pareja. La API expone GET, POST y DELETE en /me/favorites. El frontend muestra un botón de corazón en la ficha y en el listado, con actualización optimista, y una página «Mis favoritos». Al estar en la base de datos, la lista es la misma en cualquier dispositivo.',
  userStories: [
    {
      asA: 'cliente de la tienda',
      iWant: 'guardar productos en favoritos',
      soThat: 'pueda comprarlos más tarde sin volver a buscarlos',
      acceptanceCriteria: [
        'Al pulsar el corazón, el producto se añade a favoritos y el icono queda marcado.',
        'Al pulsarlo de nuevo, el producto se quita de favoritos.',
        'La lista es la misma en el móvil y en el ordenador.',
      ],
    },
    {
      asA: 'cliente de la tienda',
      iWant: 'ver mis favoritos en una página',
      soThat: 'pueda añadirlos al carrito desde allí',
      acceptanceCriteria: [
        'La página muestra precio y disponibilidad actuales de cada producto.',
        'Un producto agotado se marca como no disponible.',
      ],
    },
  ],
  tasks: {
    frontend: [
      {
        title: 'Botón de favorito',
        description: 'Componente con estado optimista y aria-pressed.',
      },
      {
        title: 'Página «Mis favoritos»',
        description: 'Lista con estados de carga, vacío y error.',
      },
    ],
    backend: [
      {
        title: 'Modelo Favorite',
        description: 'Migración con clave única (customerId, productId).',
      },
      { title: 'Endpoints /me/favorites', description: 'GET paginado, POST idempotente y DELETE.' },
      { title: 'Límite de 200 favoritos', description: 'Responder 409 al superar el límite.' },
    ],
  },
  risks: [
    {
      description: 'Clics repetidos crean duplicados',
      severity: 'medium',
      mitigation: 'Clave única y POST idempotente.',
    },
    {
      description: 'Productos eliminados del catálogo',
      severity: 'low',
      mitigation: 'Borrado en cascada o filtrado al listar.',
    },
  ],
  edgeCases: [
    'Cliente sin sesión que pulsa el corazón',
    'Producto que se elimina del catálogo estando en favoritos',
    'Dos pestañas abiertas que añaden y quitan a la vez',
  ],
  testCases: [
    {
      title: 'Añadir y quitar un favorito',
      type: 'integration',
      steps: ['Iniciar sesión', 'Añadir un producto', 'Quitarlo'],
      expectedResult: 'La lista queda vacía y no hay duplicados.',
    },
    {
      title: 'Favoritos en dos dispositivos',
      type: 'e2e',
      steps: ['Añadir un favorito en el móvil', 'Abrir la página en el ordenador'],
      expectedResult: 'El producto aparece en «Mis favoritos».',
    },
  ],
  complexity: {
    size: 'M',
    rationale: 'Una entidad nueva, tres endpoints y dos componentes, sin integraciones externas.',
  },
};
