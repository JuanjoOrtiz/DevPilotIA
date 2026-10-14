// Datos de demostración del seed: 3 proyectos y 25 generaciones repartidas en 30 días.
// Las especificaciones están escritas aquí, así que el seed no llama al modelo.
import type {
  ClarifyingQuestion,
  Complexity,
  ErrorCode,
  GenerationType,
  Severity,
  Specification,
  TestType,
} from '@devpilot/shared';

export interface SampleProject {
  key: 'portal' | 'bookings' | 'billing';
  name: string;
  description: string;
  techStack: string[];
  conventions: string;
}

export const SAMPLE_PROJECTS: readonly SampleProject[] = [
  {
    key: 'portal',
    name: 'Portal de clientes',
    description: 'Área privada donde los clientes consultan sus pedidos, facturas y envíos.',
    techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    conventions:
      'Clean Architecture en el backend. Componentes con Atomic Design. Tests con Vitest y Playwright.',
  },
  {
    key: 'bookings',
    name: 'App de reservas',
    description: 'Aplicación móvil para reservar clases en una cadena de gimnasios.',
    techStack: ['React Native', 'Expo', 'NestJS', 'PostgreSQL'],
    conventions: 'Monorepo con Nx. Módulos por funcionalidad en NestJS. Tests con Jest.',
  },
  {
    key: 'billing',
    name: 'API de facturación',
    description: 'Servicio interno que emite facturas y las envía a contabilidad.',
    techStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis'],
    conventions: 'API REST versionada. Errores con código estable. Migraciones con Prisma.',
  },
];

type Task = [title: string, description: string];
type Risk = [description: string, severity: Severity, mitigation: string];
type TestCase = [title: string, type: TestType, steps: string[], expectedResult: string];

/** Lo que cambia de una especificación a otra; el resto lo completa `toSpecification`. */
interface SpecDraft {
  title: string;
  size: Complexity;
  rationale: string;
  assumptions?: string[];
  technical: string;
  story: [asA: string, iWant: string, soThat: string, criteria: string[]];
  frontend: Task[];
  backend: Task[];
  risks: Risk[];
  edgeCases: string[];
  tests: TestCase[];
}

interface BaseEntry {
  project: SampleProject['key'];
  type: GenerationType;
  inputText: string;
  /** Hace cuántos días se creó, de 0 (hoy) a 29. */
  daysAgo: number;
  /** Hora UTC de creación. */
  hour: number;
}

export type SampleGeneration =
  | (BaseEntry & {
      status: 'completed';
      durationMs: number;
      spec: SpecDraft;
      /** Cambios que hizo el usuario sobre la versión de la IA (RF-EDI-01). */
      edit?: Partial<Pick<Specification, 'title' | 'assumptions'>> & { extraBackendTask?: Task };
    })
  | (BaseEntry & { status: 'failed'; errorCode: ErrorCode })
  | (BaseEntry & { status: 'needs_clarification'; questions: ClarifyingQuestion[] });

export function toSpecification(draft: SpecDraft): Specification {
  const [asA, iWant, soThat, acceptanceCriteria] = draft.story;
  const task = ([title, description]: Task) => ({ title, description });
  return {
    schemaVersion: 1,
    title: draft.title,
    assumptions: draft.assumptions ?? [],
    technicalDescription: draft.technical,
    userStories: [{ asA, iWant, soThat, acceptanceCriteria }],
    tasks: { frontend: draft.frontend.map(task), backend: draft.backend.map(task) },
    risks: draft.risks.map(([description, severity, mitigation]) => ({
      description,
      severity,
      mitigation,
    })),
    edgeCases: draft.edgeCases,
    testCases: draft.tests.map(([title, type, steps, expectedResult]) => ({
      title,
      type,
      steps,
      expectedResult,
    })),
    complexity: { size: draft.size, rationale: draft.rationale },
  };
}

/** La versión editada: la de la IA con los cambios del usuario. */
export function toEditedSpecification(
  specification: Specification,
  edit: NonNullable<Extract<SampleGeneration, { status: 'completed' }>['edit']>,
): Specification {
  const { extraBackendTask, ...changes } = edit;
  return {
    ...specification,
    ...changes,
    tasks: {
      ...specification.tasks,
      backend: extraBackendTask
        ? [
            ...specification.tasks.backend,
            { title: extraBackendTask[0], description: extraBackendTask[1] },
          ]
        : specification.tasks.backend,
    },
  };
}

export const SAMPLE_GENERATIONS: readonly SampleGeneration[] = [
  // ------------------------------------------------------------ Portal de clientes (11)
  {
    project: 'portal',
    type: 'feature',
    status: 'completed',
    daysAgo: 29,
    hour: 9,
    durationMs: 11_200,
    inputText:
      'Quiero que los clientes puedan descargar todo su historial de pedidos en un fichero CSV desde su área privada.',
    spec: {
      title: 'Exportar el historial de pedidos a CSV',
      size: 'M',
      rationale: 'Un endpoint con streaming y un botón en una pantalla existente.',
      assumptions: ['Se exportan todos los pedidos del cliente, sin filtro de fechas.'],
      technical:
        'Nuevo endpoint GET /orders/export que genera el CSV en streaming desde PostgreSQL con un cursor, para no cargar todos los pedidos en memoria. El frontend descarga el fichero con el nombre que llega en Content-Disposition.',
      story: [
        'cliente del portal',
        'descargar mis pedidos en un CSV',
        'analizarlos en una hoja de cálculo',
        [
          'El fichero incluye fecha, número de pedido, importe y estado.',
          'Solo contiene pedidos del cliente en sesión.',
          'Un cliente sin pedidos descarga un CSV con la cabecera.',
        ],
      ],
      frontend: [
        ['Botón «Exportar CSV»', 'En la cabecera de la lista de pedidos, con estado de carga.'],
      ],
      backend: [
        ['Endpoint de exportación', 'GET /orders/export con streaming y filtro por usuario.'],
        ['Formato CSV', 'Separador coma, UTF-8 con BOM para que Excel lea los acentos.'],
      ],
      risks: [
        ['Exportaciones muy grandes', 'medium', 'Streaming con cursor y límite de 50.000 filas.'],
      ],
      edgeCases: ['Cliente sin pedidos', 'Importes con decimales y moneda distinta'],
      tests: [
        [
          'Exporta solo los pedidos propios',
          'integration',
          ['Crear pedidos de dos clientes', 'Exportar como el primero'],
          'El CSV solo tiene los pedidos del primero.',
        ],
      ],
    },
  },
  {
    project: 'portal',
    type: 'bug',
    status: 'completed',
    daysAgo: 27,
    hour: 11,
    durationMs: 7_800,
    inputText:
      'Al cambiar el idioma a inglés, las fechas de la lista de facturas siguen saliendo en formato español.',
    spec: {
      title: 'Las fechas de las facturas no siguen el idioma',
      size: 'S',
      rationale: 'Cambiar el formateo a Intl con el idioma activo.',
      technical:
        'La lista de facturas formatea las fechas con una función que fija el locale es-ES. Hay que usar Intl.DateTimeFormat con el idioma de i18next y volver a pintar al cambiarlo.',
      story: [
        'cliente que usa el portal en inglés',
        'ver las fechas en el formato de mi idioma',
        'no confundir días y meses',
        [
          'Con el idioma en inglés, las fechas salen como Oct 9, 2026.',
          'Al cambiar de idioma, la lista se actualiza sin recargar.',
        ],
      ],
      frontend: [
        [
          'Formateo con el idioma activo',
          'Sustituir formatDate por un hook que lea i18n.language.',
        ],
      ],
      backend: [],
      risks: [
        ['Otras pantallas con el mismo fallo', 'low', 'Buscar todos los usos de formatDate.'],
      ],
      edgeCases: ['Idioma no soportado: se usa el español'],
      tests: [
        [
          'Cambia el formato al cambiar de idioma',
          'unit',
          ['Pintar la lista en español', 'Cambiar a inglés'],
          'Las fechas pasan al formato inglés.',
        ],
      ],
    },
  },
  {
    project: 'portal',
    type: 'feature',
    status: 'completed',
    daysAgo: 25,
    hour: 15,
    durationMs: 13_400,
    inputText:
      'Los clientes deberían recibir un email cuando su pedido cambie de estado (enviado, entregado, devuelto), con un enlace al pedido.',
    spec: {
      title: 'Avisos por email de cambios de estado del pedido',
      size: 'L',
      rationale: 'Cola de envíos, plantillas en dos idiomas y preferencias del cliente.',
      assumptions: ['Ya existe un proveedor de email transaccional contratado.'],
      technical:
        'Cada cambio de estado publica un evento OrderStatusChanged. Un worker lo consume, compone el email con la plantilla del idioma del cliente y lo envía por el proveedor. Los envíos se registran para no duplicarlos si el evento se repite.',
      story: [
        'cliente',
        'recibir un email cuando mi pedido cambie de estado',
        'saber cuándo llega sin entrar en el portal',
        [
          'Se envía un email por cada cambio a enviado, entregado o devuelto.',
          'El email enlaza al detalle del pedido.',
          'El cliente puede desactivar estos avisos en su perfil.',
        ],
      ],
      frontend: [['Preferencia de avisos', 'Interruptor en el perfil del cliente.']],
      backend: [
        ['Evento de cambio de estado', 'Publicar OrderStatusChanged al actualizar el pedido.'],
        ['Worker de emails', 'Consumir el evento y enviar con reintentos.'],
        ['Registro de envíos', 'Tabla con clave única por pedido y estado.'],
      ],
      risks: [
        ['Emails duplicados', 'medium', 'Clave de idempotencia por pedido y estado.'],
        ['Proveedor caído', 'medium', 'Reintentos con espera exponencial.'],
      ],
      edgeCases: ['Pedido que salta de enviado a devuelto', 'Cliente sin email verificado'],
      tests: [
        [
          'Envía un único email por cambio',
          'integration',
          ['Cambiar el pedido a enviado', 'Repetir el evento'],
          'Solo se registra un envío.',
        ],
      ],
    },
  },
  {
    project: 'portal',
    type: 'feature',
    status: 'failed',
    errorCode: 'LLM_TIMEOUT',
    daysAgo: 22,
    hour: 10,
    inputText:
      'Añadir un chat de soporte en el portal para que los clientes hablen con el equipo de atención sin salir de la página.',
  },
  {
    project: 'portal',
    type: 'feature',
    status: 'completed',
    daysAgo: 20,
    hour: 16,
    durationMs: 9_600,
    inputText:
      'Quiero un buscador en la lista de pedidos que filtre por número de pedido o por nombre de producto mientras se escribe.',
    spec: {
      title: 'Buscador en la lista de pedidos',
      size: 'M',
      rationale: 'Índice en base de datos, parámetro nuevo y campo con espera.',
      technical:
        'GET /orders acepta un parámetro q que busca por número de pedido exacto o por nombre de producto con ILIKE sobre un índice trigram. El frontend espera 300 ms tras la última tecla antes de pedir.',
      story: [
        'cliente con muchos pedidos',
        'buscar un pedido por número o producto',
        'encontrarlo sin recorrer páginas',
        [
          'Los resultados se actualizan al dejar de escribir.',
          'Sin resultados se muestra un mensaje y la opción de limpiar.',
        ],
      ],
      frontend: [['Campo de búsqueda', 'Con espera de 300 ms y botón para limpiar.']],
      backend: [['Parámetro q', 'Búsqueda con índice pg_trgm sobre el nombre del producto.']],
      risks: [['Consultas lentas', 'medium', 'Índice trigram y mínimo de 3 caracteres.']],
      edgeCases: ['Texto con acentos', 'Número de pedido con espacios'],
      tests: [
        [
          'Encuentra por producto',
          'integration',
          ['Crear un pedido con «Zapatillas»', 'Buscar «zapat»'],
          'El pedido aparece en los resultados.',
        ],
      ],
    },
    edit: {
      title: 'Buscador de pedidos por número o producto',
      extraBackendTask: [
        'Migración del índice',
        'Crear la extensión pg_trgm y el índice en producción.',
      ],
    },
  },
  {
    project: 'portal',
    type: 'bug',
    status: 'completed',
    daysAgo: 18,
    hour: 12,
    durationMs: 6_900,
    inputText:
      'En móvil, el botón de descargar factura queda tapado por el banner de cookies y no se puede pulsar.',
    spec: {
      title: 'El banner de cookies tapa la descarga de facturas en móvil',
      size: 'S',
      rationale: 'Ajuste de CSS y del espacio inferior de la página.',
      technical:
        'El banner es fixed con z-index alto y no reserva espacio. Hay que añadir un padding inferior al contenedor principal mientras el banner esté visible.',
      story: [
        'cliente en el móvil',
        'pulsar «Descargar factura» aunque el banner esté visible',
        'no tener que aceptar las cookies para usar el portal',
        ['El botón es visible y pulsable con el banner abierto en 360 px.'],
      ],
      frontend: [
        ['Espacio para el banner', 'Variable CSS con la altura del banner aplicada al contenido.'],
      ],
      backend: [],
      risks: [],
      edgeCases: ['Pantallas de 320 px', 'Banner con texto en dos líneas'],
      tests: [
        [
          'El botón se puede pulsar en móvil',
          'e2e',
          ['Abrir una factura en 360 px', 'Pulsar «Descargar»'],
          'Se descarga el PDF.',
        ],
      ],
    },
  },
  {
    project: 'portal',
    type: 'feature',
    status: 'completed',
    daysAgo: 15,
    hour: 9,
    durationMs: 15_100,
    inputText:
      'Permitir que un cliente invite a otras personas de su empresa al portal con permisos de solo lectura o de gestión.',
    spec: {
      title: 'Usuarios de empresa con permisos',
      size: 'XL',
      rationale:
        'Toca el modelo de datos, la autorización de todas las rutas y el alta por invitación.',
      assumptions: ['Una persona solo pertenece a una empresa.'],
      technical:
        'Nueva entidad Company con miembros y rol (viewer o manager). Todas las consultas pasan a filtrar por empresa. Las invitaciones son enlaces de un solo uso que caducan en 7 días.',
      story: [
        'administrador de la cuenta de empresa',
        'invitar a compañeros con un rol',
        'que consulten o gestionen pedidos sin compartir mi contraseña',
        [
          'La invitación llega por email y caduca en 7 días.',
          'Un viewer no puede cancelar pedidos.',
          'El administrador puede retirar el acceso.',
        ],
      ],
      frontend: [
        ['Pantalla de equipo', 'Lista de miembros con su rol y botón para invitar.'],
        ['Alta por invitación', 'Formulario de registro con el email ya rellenado.'],
      ],
      backend: [
        [
          'Modelo de empresa',
          'Tablas companies y memberships con migración de los clientes actuales.',
        ],
        ['Autorización por rol', 'Middleware que comprueba el rol en las rutas de escritura.'],
        ['Invitaciones', 'Token de un solo uso guardado como hash.'],
      ],
      risks: [
        ['Fuga de datos entre empresas', 'high', 'Tests de aislamiento en cada endpoint.'],
        ['Migración de cuentas existentes', 'medium', 'Crear una empresa por cliente actual.'],
      ],
      edgeCases: [
        'Invitación a un email ya registrado',
        'El último manager intenta quitarse el rol',
      ],
      tests: [
        [
          'Un viewer no cancela pedidos',
          'integration',
          ['Invitar a un viewer', 'Intentar cancelar un pedido'],
          'La API responde 403.',
        ],
      ],
    },
  },
  {
    project: 'portal',
    type: 'bug',
    status: 'failed',
    errorCode: 'LLM_INVALID_RESPONSE',
    daysAgo: 11,
    hour: 17,
    inputText:
      'A veces el total del carrito no coincide con la suma de las líneas cuando hay un descuento por cupón aplicado.',
  },
  {
    project: 'portal',
    type: 'feature',
    status: 'completed',
    daysAgo: 8,
    hour: 10,
    durationMs: 12_300,
    inputText:
      'Mostrar en el detalle del pedido el seguimiento del envío con los eventos del transportista.',
    spec: {
      title: 'Seguimiento del envío en el detalle del pedido',
      size: 'M',
      rationale: 'Integración de lectura con un transportista y una línea de tiempo.',
      technical:
        'El backend consulta la API del transportista con el número de seguimiento y guarda la respuesta 15 minutos en Redis. El frontend pinta los eventos como una línea de tiempo.',
      story: [
        'cliente',
        'ver por dónde va mi envío',
        'saber cuándo llegará sin llamar a soporte',
        [
          'Se ven los eventos con fecha y lugar.',
          'Si el transportista no responde, se muestra el último estado guardado.',
        ],
      ],
      frontend: [
        ['Línea de tiempo del envío', 'Componente con los eventos de más reciente a más antiguo.'],
      ],
      backend: [
        ['Cliente del transportista', 'Con caché de 15 minutos y tiempo de espera de 5 s.'],
      ],
      risks: [['API del transportista lenta', 'medium', 'Caché y tiempo de espera corto.']],
      edgeCases: ['Pedido sin número de seguimiento', 'Envío dividido en varios paquetes'],
      tests: [
        [
          'Muestra el último estado si falla el transportista',
          'integration',
          ['Simular un error del transportista'],
          'Se devuelve el estado guardado.',
        ],
      ],
    },
  },
  {
    project: 'portal',
    type: 'feature',
    status: 'needs_clarification',
    daysAgo: 3,
    hour: 14,
    inputText: 'Quiero añadir pagos aplazados en el portal.',
    questions: [
      {
        id: 'q1',
        question: '¿Qué proveedor de pago aplazado se va a usar?',
        why: 'Decide la integración del backend y los estados del pago.',
      },
      {
        id: 'q2',
        question: '¿Hay un importe mínimo para ofrecer el aplazamiento?',
        why: 'Afecta a las reglas de validación y a los criterios de aceptación.',
      },
    ],
  },
  {
    project: 'portal',
    type: 'bug',
    status: 'completed',
    daysAgo: 0,
    hour: 8,
    durationMs: 8_100,
    inputText:
      'Después de cerrar sesión, si pulsas atrás en el navegador se ve la última página del área privada.',
    spec: {
      title: 'El área privada se ve tras cerrar sesión con «Atrás»',
      size: 'S',
      rationale: 'Cabeceras de caché y una comprobación de sesión al volver.',
      technical:
        'Las páginas privadas se guardan en la caché del navegador. Hay que enviar Cache-Control: no-store en las respuestas con sesión y comprobar la sesión en el evento pageshow.',
      story: [
        'cliente en un ordenador compartido',
        'que nadie vea mis datos tras cerrar sesión',
        'proteger mi información',
        ['Tras cerrar sesión, «Atrás» lleva al login.'],
      ],
      frontend: [['Comprobación al volver', 'Escuchar pageshow y redirigir si no hay sesión.']],
      backend: [['Cabeceras sin caché', 'Cache-Control: no-store en las rutas con sesión.']],
      risks: [['Más peticiones al servidor', 'low', 'Solo afecta a páginas privadas.']],
      edgeCases: ['Varias pestañas abiertas'],
      tests: [
        [
          'Atrás tras cerrar sesión',
          'e2e',
          ['Entrar', 'Cerrar sesión', 'Pulsar «Atrás»'],
          'Se muestra el login.',
        ],
      ],
    },
  },

  // ------------------------------------------------------------ App de reservas (9)
  {
    project: 'bookings',
    type: 'feature',
    status: 'completed',
    daysAgo: 22,
    hour: 13,
    durationMs: 14_200,
    inputText:
      'Los socios deberían poder apuntarse a una lista de espera cuando una clase está llena y recibir un aviso si queda una plaza libre.',
    spec: {
      title: 'Lista de espera para clases completas',
      size: 'L',
      rationale: 'Cola por clase, notificaciones push y reserva temporal de la plaza.',
      technical:
        'Cada clase tiene una cola ordenada por fecha de alta. Al cancelarse una reserva, el primero de la cola recibe un push y dispone de 15 minutos para confirmar; si no, pasa al siguiente.',
      story: [
        'socio',
        'apuntarme a la lista de espera de una clase llena',
        'conseguir plaza si alguien cancela',
        [
          'Veo mi posición en la lista.',
          'Recibo un push cuando queda una plaza.',
          'Si no confirmo en 15 minutos, la plaza pasa al siguiente.',
        ],
      ],
      frontend: [
        ['Botón de lista de espera', 'En la ficha de la clase cuando no hay plazas.'],
        ['Confirmación desde el aviso', 'Abrir la clase con la plaza reservada.'],
      ],
      backend: [
        ['Cola por clase', 'Tabla waitlist_entries con índice por clase y fecha.'],
        ['Temporizador de confirmación', 'Job que libera la plaza a los 15 minutos.'],
      ],
      risks: [['Dos socios con la misma plaza', 'high', 'Bloqueo de fila al asignar la plaza.']],
      edgeCases: [
        'La clase empieza antes de que nadie confirme',
        'Socio en la lista que reserva otra clase a la misma hora',
      ],
      tests: [
        [
          'La plaza pasa al siguiente',
          'integration',
          [
            'Llenar una clase',
            'Apuntar a dos socios',
            'Cancelar una reserva',
            'Esperar 15 minutos',
          ],
          'El segundo socio recibe el aviso.',
        ],
      ],
    },
  },
  {
    project: 'bookings',
    type: 'bug',
    status: 'completed',
    daysAgo: 26,
    hour: 18,
    durationMs: 7_200,
    inputText:
      'En Android, las clases de las 00:30 aparecen en el día anterior en el calendario de la app.',
    spec: {
      title: 'Clases de madrugada en el día equivocado en Android',
      size: 'S',
      rationale: 'Conversión de zona horaria en un único punto.',
      technical:
        'El calendario agrupa por la fecha UTC en lugar de la fecha local del gimnasio. Hay que convertir con la zona del gimnasio antes de agrupar.',
      story: [
        'socio',
        'ver cada clase en su día',
        'no perderme las sesiones de madrugada',
        ['Una clase a las 00:30 hora local aparece en su día.'],
      ],
      frontend: [['Agrupar por fecha local', 'Usar la zona horaria del gimnasio al agrupar.']],
      backend: [['Zona del gimnasio en la respuesta', 'Añadir timeZone a GET /gyms/:id.']],
      risks: [['Cambio de hora en octubre', 'medium', 'Tests con fechas del cambio de horario.']],
      edgeCases: ['Día del cambio de hora'],
      tests: [
        [
          'Agrupa la clase de las 00:30',
          'unit',
          ['Crear una clase a las 00:30 en Europe/Madrid'],
          'Aparece en su día local.',
        ],
      ],
    },
  },
  {
    project: 'bookings',
    type: 'feature',
    status: 'completed',
    daysAgo: 22,
    hour: 9,
    durationMs: 10_500,
    inputText:
      'Quiero que los socios puedan valorar una clase del 1 al 5 después de asistir, con un comentario opcional.',
    spec: {
      title: 'Valorar las clases después de asistir',
      size: 'M',
      rationale: 'Una entidad nueva, un formulario y la media en la ficha del monitor.',
      technical:
        'Tras el check-in, la app pide una valoración al día siguiente. Solo se puede valorar una vez por reserva y la media se recalcula al guardar.',
      story: [
        'socio',
        'valorar la clase a la que he ido',
        'ayudar a mejorar las clases',
        ['Solo se valora con asistencia registrada.', 'Una valoración por reserva.'],
      ],
      frontend: [['Formulario de valoración', 'Estrellas y comentario de 500 caracteres.']],
      backend: [['Valoraciones', 'POST /bookings/:id/rating con validación de asistencia.']],
      risks: [['Comentarios ofensivos', 'low', 'Moderación desde el panel del gimnasio.']],
      edgeCases: ['Clase cancelada por el gimnasio'],
      tests: [
        [
          'No valora sin asistencia',
          'integration',
          ['Reservar sin hacer check-in', 'Enviar valoración'],
          'La API responde 409.',
        ],
      ],
    },
  },
  {
    project: 'bookings',
    type: 'bug',
    status: 'failed',
    errorCode: 'LLM_RATE_LIMITED',
    daysAgo: 15,
    hour: 19,
    inputText:
      'Las notificaciones push de recordatorio llegan dos veces a algunos usuarios de iOS.',
  },
  {
    project: 'bookings',
    type: 'feature',
    status: 'completed',
    daysAgo: 20,
    hour: 11,
    durationMs: 16_800,
    inputText:
      'Añadir bonos de clases: el socio compra un bono de 10 sesiones y cada reserva descuenta una.',
    spec: {
      title: 'Bonos de clases prepago',
      size: 'XL',
      rationale: 'Pagos, saldo con concurrencia, caducidad y devoluciones.',
      assumptions: ['El cobro se hace con la pasarela que ya usa el gimnasio.'],
      technical:
        'Nueva entidad Pass con saldo de sesiones. Reservar descuenta una sesión en la misma transacción que crea la reserva; cancelar a tiempo la devuelve. Un job marca como caducados los bonos vencidos.',
      story: [
        'socio',
        'comprar un bono de 10 clases',
        'pagar menos por clase',
        [
          'Al reservar se descuenta una sesión.',
          'Cancelar con 2 horas de antelación devuelve la sesión.',
          'El bono caduca a los 3 meses.',
        ],
      ],
      frontend: [
        ['Compra del bono', 'Pantalla de pago con resumen.'],
        ['Saldo visible', 'Sesiones restantes en el perfil y al reservar.'],
      ],
      backend: [
        ['Modelo de bonos', 'Tabla passes con saldo y caducidad.'],
        ['Descuento transaccional', 'Reserva y descuento en la misma transacción.'],
        ['Caducidad', 'Job diario que caduca los bonos.'],
      ],
      risks: [
        ['Saldo negativo por reservas simultáneas', 'high', 'UPDATE condicional sobre el saldo.'],
        ['Devoluciones de pago', 'medium', 'Anular las sesiones no usadas.'],
      ],
      edgeCases: ['Dos bonos activos a la vez', 'Reserva el último día de validez'],
      tests: [
        [
          'No reserva sin saldo',
          'integration',
          ['Agotar el bono', 'Intentar reservar'],
          'La API responde 409.',
        ],
      ],
    },
    edit: {
      assumptions: [
        'El cobro se hace con la pasarela que ya usa el gimnasio.',
        'No se permiten bonos compartidos entre socios.',
      ],
    },
  },
  {
    project: 'bookings',
    type: 'feature',
    status: 'completed',
    daysAgo: 8,
    hour: 10,
    durationMs: 9_900,
    inputText: 'Que los socios puedan añadir sus reservas al calendario del móvil con un botón.',
    spec: {
      title: 'Añadir reservas al calendario del móvil',
      size: 'S',
      rationale: 'Un fichero .ics generado en el cliente.',
      technical:
        'La app genera un evento iCalendar con la hora, la sala y el monitor, y lo abre con la API de calendario de Expo.',
      story: [
        'socio',
        'añadir mi reserva al calendario',
        'no olvidarme de la clase',
        ['El evento incluye hora, sala y monitor.'],
      ],
      frontend: [
        ['Botón «Añadir al calendario»', 'Con permiso de calendario solicitado al pulsar.'],
      ],
      backend: [],
      risks: [['Permiso denegado', 'low', 'Mensaje con los pasos para activarlo.']],
      edgeCases: ['Reserva cancelada después de añadirla'],
      tests: [
        [
          'Crea el evento',
          'unit',
          ['Generar el evento de una reserva'],
          'El evento tiene la hora y la sala.',
        ],
      ],
    },
  },
  {
    project: 'bookings',
    type: 'bug',
    status: 'completed',
    daysAgo: 3,
    hour: 16,
    durationMs: 8_400,
    inputText:
      'Si dos socios reservan la última plaza a la vez, a veces los dos quedan apuntados y la clase supera el aforo.',
    spec: {
      title: 'Se supera el aforo con reservas simultáneas',
      size: 'M',
      rationale: 'Control de concurrencia en la reserva y limpieza de los casos existentes.',
      technical:
        'La reserva comprueba el aforo y después inserta, sin bloqueo. Hay que hacer el incremento de plazas ocupadas con un UPDATE condicional y crear la reserva solo si afecta a una fila.',
      story: [
        'responsable del gimnasio',
        'que nunca se supere el aforo',
        'cumplir la normativa de la sala',
        ['Con 50 reservas simultáneas a la última plaza, solo una tiene éxito.'],
      ],
      frontend: [['Mensaje de plaza ocupada', 'Si la reserva falla, refrescar la clase y avisar.']],
      backend: [
        ['Reserva atómica', 'UPDATE classes SET booked = booked + 1 WHERE booked < capacity.'],
        [
          'Revisión de clases con exceso',
          'Script que lista las clases con más reservas que aforo.',
        ],
      ],
      risks: [['Bloqueos en horas punta', 'low', 'Transacción corta sin llamadas externas.']],
      edgeCases: ['Cancelación y reserva a la vez'],
      tests: [
        [
          'Concurrencia en la última plaza',
          'integration',
          ['Lanzar 50 reservas a la vez sobre una plaza'],
          'Solo una reserva se crea.',
        ],
      ],
    },
  },
  {
    project: 'bookings',
    type: 'feature',
    status: 'completed',
    daysAgo: 3,
    hour: 12,
    durationMs: 12_700,
    inputText:
      'Panel para monitores donde vean quién está apuntado a su clase y marquen la asistencia.',
    spec: {
      title: 'Panel de asistencia para monitores',
      size: 'L',
      rationale: 'Un rol nuevo, pantallas propias y reglas de edición por horario.',
      technical:
        'Rol instructor con acceso a sus clases del día. La asistencia se marca desde 15 minutos antes hasta 2 horas después del inicio; fuera de ese margen solo la cambia un responsable.',
      story: [
        'monitor',
        'ver los apuntados y marcar quién ha venido',
        'que la asistencia quede registrada sin papel',
        ['Solo veo mis clases.', 'Puedo marcar la asistencia dentro del margen horario.'],
      ],
      frontend: [
        ['Lista del día', 'Clases del monitor con número de apuntados.'],
        ['Pasar lista', 'Lista con casillas y guardado automático.'],
      ],
      backend: [
        ['Rol instructor', 'Autorización por clase asignada.'],
        ['Registro de asistencia', 'PATCH /classes/:id/attendance con validación de margen.'],
      ],
      risks: [['Monitor sustituto', 'medium', 'Asignación temporal desde el panel del gimnasio.']],
      edgeCases: ['Socio que llega tarde', 'Clase cancelada en el último momento'],
      tests: [
        [
          'No marca fuera de horario',
          'integration',
          ['Marcar asistencia 3 horas después'],
          'La API responde 409.',
        ],
      ],
    },
  },
  {
    project: 'bookings',
    type: 'bug',
    status: 'completed',
    daysAgo: 1,
    hour: 9,
    durationMs: 7_500,
    inputText:
      'El contador de plazas libres no se actualiza tras cancelar una reserva hasta que se reinicia la app.',
    spec: {
      title: 'Las plazas libres no se actualizan al cancelar',
      size: 'S',
      rationale: 'Invalidar la caché de la clase después de cancelar.',
      technical:
        'Después de cancelar, la app no invalida la consulta de la clase en la caché de TanStack Query. Hay que invalidarla en el onSuccess de la cancelación.',
      story: [
        'socio',
        'ver las plazas reales después de cancelar',
        'saber si puedo volver a reservar',
        ['Al cancelar, la plaza libre aparece sin reiniciar la app.'],
      ],
      frontend: [['Invalidar la clase', 'invalidateQueries de la clase y de la lista del día.']],
      backend: [],
      risks: [],
      edgeCases: ['Cancelar sin conexión'],
      tests: [
        [
          'Refresca las plazas',
          'unit',
          ['Cancelar una reserva'],
          'La consulta de la clase se vuelve a pedir.',
        ],
      ],
    },
  },

  // ------------------------------------------------------------ API de facturación (5)
  {
    project: 'billing',
    type: 'feature',
    status: 'completed',
    daysAgo: 11,
    hour: 10,
    durationMs: 13_900,
    inputText:
      'Enviar cada factura emitida a contabilidad mediante un webhook firmado, con reintentos si su sistema no responde.',
    spec: {
      title: 'Webhook firmado de facturas emitidas',
      size: 'L',
      rationale: 'Firma, cola con reintentos y panel de entregas fallidas.',
      technical:
        'Al emitir una factura se encola un envío. Un worker hace POST al endpoint de contabilidad con el cuerpo firmado con HMAC-SHA256 y reintenta con espera exponencial hasta 24 horas.',
      story: [
        'responsable de contabilidad',
        'recibir cada factura emitida en mi sistema',
        'no introducirlas a mano',
        ['Cada envío lleva la cabecera de firma.', 'Los fallos se reintentan durante 24 horas.'],
      ],
      frontend: [],
      backend: [
        ['Cola de envíos', 'Tabla deliveries con estado e intentos, procesada con Redis.'],
        ['Firma HMAC', 'Cabecera X-Signature con marca de tiempo.'],
        ['Reenvío manual', 'POST /deliveries/:id/retry para soporte.'],
      ],
      risks: [['Secreto de firma filtrado', 'high', 'Rotación con dos secretos válidos a la vez.']],
      edgeCases: [
        'Contabilidad responde 200 con cuerpo de error',
        'Factura anulada antes del envío',
      ],
      tests: [
        [
          'Reintenta tras un 503',
          'integration',
          ['Simular un 503', 'Procesar la cola'],
          'Se programa un nuevo intento.',
        ],
      ],
    },
  },
  {
    project: 'billing',
    type: 'bug',
    status: 'completed',
    daysAgo: 18,
    hour: 15,
    durationMs: 6_400,
    inputText:
      'Algunas facturas salen con el IVA redondeado mal por un céntimo cuando tienen muchas líneas.',
    spec: {
      title: 'Error de un céntimo en el IVA de facturas largas',
      size: 'M',
      rationale: 'Cambio de cálculo a céntimos enteros y regularización de facturas emitidas.',
      technical:
        'El IVA se redondea línea a línea con números de coma flotante. Hay que calcular en céntimos enteros y redondear una vez sobre la base de cada tipo de IVA.',
      story: [
        'responsable de contabilidad',
        'que el IVA cuadre siempre',
        'no tener que rectificar facturas',
        [
          'El IVA se calcula sobre la base agrupada por tipo.',
          'Ninguna factura de prueba tiene diferencias.',
        ],
      ],
      frontend: [],
      backend: [
        ['Cálculo en céntimos', 'Sustituir los importes en coma flotante por enteros.'],
        ['Informe de facturas afectadas', 'Consulta de las emitidas con diferencia.'],
      ],
      risks: [['Facturas ya emitidas', 'high', 'Rectificativas solo para las afectadas.']],
      edgeCases: ['Líneas con importe negativo', 'Varios tipos de IVA en una factura'],
      tests: [
        [
          'Cuadra una factura de 200 líneas',
          'unit',
          ['Calcular una factura de 200 líneas de 0,333 €'],
          'El IVA coincide con el cálculo sobre la base.',
        ],
      ],
    },
    edit: {
      extraBackendTask: [
        'Test de propiedades',
        'Comparar con un cálculo de referencia sobre facturas aleatorias.',
      ],
    },
  },
  {
    project: 'billing',
    type: 'feature',
    status: 'completed',
    daysAgo: 5,
    hour: 11,
    durationMs: 10_800,
    inputText: 'Generar el PDF de cada factura con el logo y los datos fiscales de la empresa.',
    spec: {
      title: 'PDF de las facturas con la imagen de la empresa',
      size: 'M',
      rationale: 'Plantilla, generación en segundo plano y almacenamiento.',
      technical:
        'Una plantilla HTML se convierte a PDF en un worker y se guarda en el almacenamiento de ficheros. GET /invoices/:id/pdf devuelve un enlace firmado de 10 minutos.',
      story: [
        'cliente que recibe la factura',
        'descargarla en PDF',
        'archivarla y presentarla',
        [
          'El PDF incluye logo, NIF y dirección fiscal.',
          'El enlace de descarga caduca en 10 minutos.',
        ],
      ],
      frontend: [],
      backend: [
        ['Plantilla de factura', 'HTML con estilos de impresión.'],
        ['Worker de PDF', 'Generación al emitir y reintento si falla.'],
      ],
      risks: [
        ['Consumo de memoria del generador', 'medium', 'Un worker con concurrencia limitada.'],
      ],
      edgeCases: ['Factura con 500 líneas', 'Nombre de cliente con caracteres no latinos'],
      tests: [
        [
          'El PDF tiene los datos fiscales',
          'integration',
          ['Emitir una factura', 'Descargar el PDF'],
          'El texto del PDF incluye el NIF.',
        ],
      ],
    },
  },
  {
    project: 'billing',
    type: 'feature',
    status: 'completed',
    daysAgo: 5,
    hour: 9,
    durationMs: 11_600,
    inputText:
      'Necesitamos un endpoint para emitir facturas rectificativas que anulen total o parcialmente otra factura.',
    spec: {
      title: 'Facturas rectificativas',
      size: 'L',
      rationale: 'Reglas fiscales, numeración propia y relación con la original.',
      technical:
        'POST /invoices/:id/corrections crea una rectificativa con serie propia que referencia a la original. La suma de rectificativas nunca supera el importe original.',
      story: [
        'responsable de facturación',
        'rectificar una factura emitida',
        'corregir errores sin borrar nada',
        [
          'La rectificativa tiene su propia serie.',
          'No se puede rectificar más del importe original.',
        ],
      ],
      frontend: [],
      backend: [
        ['Endpoint de rectificativas', 'Con validación del importe pendiente.'],
        ['Serie de numeración', 'Contador propio sin huecos.'],
      ],
      risks: [['Huecos en la numeración', 'high', 'Contador en una transacción con bloqueo.']],
      edgeCases: ['Rectificar una rectificativa', 'Factura de otro ejercicio fiscal'],
      tests: [
        [
          'No supera el importe original',
          'integration',
          ['Rectificar el 100 %', 'Intentar rectificar de nuevo'],
          'La API responde 409.',
        ],
      ],
    },
  },
  {
    project: 'billing',
    type: 'bug',
    status: 'failed',
    errorCode: 'LLM_UNAVAILABLE',
    daysAgo: 1,
    hour: 17,
    inputText:
      'El job nocturno de vencimientos se ejecuta dos veces cuando hay dos réplicas del servicio desplegadas.',
  },
];
