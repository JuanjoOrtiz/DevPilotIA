# Contrato de IA

El backend nunca confía en la respuesta del modelo: toda especificación se valida contra un esquema antes de guardarse.

## Proveedores

El caso de uso depende de la interfaz `LLMProvider`, declarada en `domain`. Hay dos implementaciones en `infrastructure/ai`:

| Implementación | Uso |
| --- | --- |
| `GeminiProvider` | Producción: Gemini API, capa gratuita, modelo Flash, con salida estructurada |
| `FakeLLMProvider` | Tests, CI y trabajo en local sin clave |

Los tests y el CI no llaman nunca al modelo real.

## Esquema de la especificación

El mismo esquema Zod, definido en `packages/shared`, se usa en tres sitios: como esquema de salida que se envía al modelo, para validar su respuesta y para validar las ediciones manuales.

```ts
type Specification = {
  schemaVersion: 1;
  title: string;                    // máx. 120 caracteres
  assumptions: string[];            // de 0 a 6; lo que la IA ha asumido sin que el usuario lo dijera (RF-GEN-10)
  technicalDescription: string;
  userStories: {                    // de 1 a 8
    asA: string;
    iWant: string;
    soThat: string;
    acceptanceCriteria: string[];   // al menos 1
  }[];
  tasks: {
    frontend: Task[];
    backend: Task[];
  };
  risks: {
    description: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  edgeCases: string[];
  testCases: {
    title: string;
    type: 'unit' | 'integration' | 'e2e';
    steps: string[];
    expectedResult: string;
  }[];
  complexity: {
    size: 'S' | 'M' | 'L' | 'XL';
    rationale: string;
  };
};

type Task = { title: string; description: string };
```

## Respuesta del modelo: preguntas o especificación

En la primera llamada el modelo decide si tiene información suficiente (RF-GEN-09). Su respuesta es una unión discriminada, validada con Zod:

```ts
type FirstResponse =
  | { kind: 'questions'; questions: ClarifyingQuestion[] }   // de 2 a 4
  | { kind: 'specification'; specification: Specification };

type ClarifyingQuestion = {
  id: string;        // q1, q2…
  question: string;  // máx. 200 caracteres
  why: string;       // qué parte de la especificación depende de la respuesta; máx. 200 caracteres
};
```

Las instrucciones piden preguntar solo cuando la falta de información cambiaría la especificación (alcance, comportamiento esperado, a quién afecta, cómo reproducir un bug), nunca por detalles que se pueden asumir de forma razonable; esos van a `assumptions`. La segunda llamada, con las respuestas, solo admite `specification`: no hay segunda ronda de preguntas.

Las seis secciones que ve el usuario (RF-GEN-02) son: descripción técnica, historias de usuario con criterios de aceptación, tareas de frontend y backend, riesgos y casos límite, casos de prueba y estimación de complejidad.

## Entrada

| Campo | Regla |
| --- | --- |
| `type` | `feature` o `bug` |
| `inputText` | Entre 20 y 4.000 caracteres |
| `additionalContext` | Opcional; hasta 2.000 caracteres |
| Contexto del proyecto | Nombre (80 caracteres), descripción (500), convenciones (2.000) y hasta 15 etiquetas de stack de 30 caracteres; lo añade el servidor, no el cliente |
| Respuestas a las preguntas aclaratorias | Hasta 500 caracteres cada una; se pueden dejar en blanco o saltar todas con `skip: true` |

La especificación, y también las preguntas aclaratorias, se escriben en el idioma que tiene la interfaz al pedirlas (`language`: `es` o `en`), sea cual sea el idioma en que escribe el usuario. Así una pantalla en inglés nunca mezcla contenido en español. Una especificación ya generada no cambia de idioma al cambiar la interfaz: es texto guardado.

## Flujo de una generación

1. La API valida la entrada y comprueba el límite diario del usuario.
2. Crea la generación en estado `generating` y responde 202 con su identificador.
3. En segundo plano construye el prompt: instrucciones fijas, contexto del proyecto y el texto del usuario delimitado como dato.
4. Llama al proveedor con el esquema de salida, temperatura baja y un tiempo máximo de 20 segundos por intento.
5. Valida la respuesta con Zod. Si no es válida, reintenta una vez indicando al modelo el error de validación.
6. Si el modelo devuelve preguntas, las guarda en `clarifyingQuestions` y pasa a `needs_clarification`. Si devuelve la especificación, la guarda y pasa a `completed`. Si falla, guarda el código de error y pasa a `failed`.
7. El frontend consulta el estado cada 2 segundos mientras sea `generating`. En `needs_clarification` muestra las preguntas.
8. Con `POST /generations/:id/answers` la API guarda las respuestas en `clarificationAnswers`, vuelve a `generating` y repite los pasos 3 a 5 añadiendo al prompt cada pregunta con su respuesta, delimitadas como dato; las preguntas sin respuesta se tratan como supuestos. Esta llamada solo acepta la especificación y termina en `completed` o `failed`. No vuelve a comprobar el límite diario: la generación ya se contó al crearla.

En producción la API es una función de Vercel. El trabajo en segundo plano del paso 3 se pasa a `waitUntil`, que mantiene viva la instancia hasta que la generación termina; sin eso, la plataforma podría suspenderla nada más enviar el 202.

La generación entera, reintentos incluidos, termina o falla en 45 segundos (RNF-08); los dos tiempos se ajustan por variable de entorno. Antes de recibir el 202, el frontend muestra un estado «pendiente» que no existe en el modelo de datos.

Cada generación registra modelo, número de intentos, duración y tokens consumidos; de ahí salen las métricas del dashboard.

## Reglas del prompt

- Las instrucciones del sistema son fijas y no incluyen texto del usuario (SEG-11).
- El texto del usuario va delimitado como dato, separado de las instrucciones (SEG-11).
- El prompt contiene solo el proyecto y el texto del usuario en sesión; nunca secretos, configuración interna ni datos de otros usuarios (SEG-12).
- El modelo no tiene herramientas ni ejecuta acciones: solo devuelve JSON.
- La salida se guarda como dato y se muestra como texto; nunca se ejecuta ni se interpreta como HTML (SEG-14).

El texto literal de las instrucciones del sistema está en `SYSTEM_INSTRUCTIONS` de `apps/api/src/application/services/GenerationPrompt.ts`. Los datos del usuario y del proyecto van en un bloque `<data>` serializado como JSON, con `<` escapado: ningún texto puede cerrar el bloque y hacerse pasar por instrucción. La salida estructurada usa `responseSchema` de la Gemini API, generado a partir del mismo esquema Zod.

## Traducción

Al cambiar el idioma de la interfaz, la especificación ya generada se traduce con el mismo proveedor (`GET /generations/:id/translation`).

- Instrucciones fijas propias (`TranslationPrompt.ts`): la especificación va como dato entre `<data>` y `</data>`, igual que la petición del usuario, y cualquier orden que contenga se traduce como un texto más.
- La respuesta se valida con el mismo esquema que una generación y, además, debe conservar la estructura: el mismo número de elementos en cada lista y los mismos `complexity.size`, `severity` y `type`.
- Una llamada de hasta 20 s; un reintento si el proveedor está caído y otro, con los problemas encontrados, si la respuesta no vale. Tras un 429 no se espera: se responde el error y la interfaz ofrece reintentar.
- Los fallos responden con el código del proveedor: `LLM_RATE_LIMITED` (429), `LLM_CONTENT_BLOCKED` (422), `LLM_INVALID_RESPONSE` (502), `LLM_UNAVAILABLE` (503) y `LLM_TIMEOUT` (504).
- La traducción se guarda y no se repite. No cuenta para los límites diarios.

## Límites

| Límite | Valor |
| --- | --- |
| Generaciones por usuario y día | Configurable; propuesta: 20 |
| Tope global diario | Protege la cuota gratuita del modelo |
| Tamaño de la entrada | Descripción de 4.000 caracteres y contexto adicional de 2.000 |
| Tokens de salida | Con tope |
| Tiempo máximo | 20 segundos por intento y 45 por generación |
| Generación de ejemplo | No llama al modelo ni cuenta para ningún límite |
| Preguntas aclaratorias | Entre 2 y 4, una sola ronda; respuestas de hasta 500 caracteres |
| Generación en `needs_clarification` | No caduca ni consume cuota mientras espera; el tiempo máximo de 45 s cuenta por cada llamada al modelo |

Al alcanzar un límite se explica cuándo se reinicia (RF-GEN-07).

## Gestión de errores

| Situación | Comportamiento | Código de error |
| --- | --- | --- |
| Entrada inválida | Respuesta 400 sin llamar al modelo | `VALIDATION_ERROR` |
| Límite diario del usuario alcanzado | Respuesta 429 con la hora de reinicio | `USER_QUOTA_EXCEEDED` |
| Tope global diario alcanzado | Respuesta 429 con la hora de reinicio | `GLOBAL_QUOTA_EXCEEDED` |
| El proveedor devuelve 429 | Hasta 2 reintentos con espera creciente; después, generación fallida | `LLM_RATE_LIMITED` |
| Un intento supera los 20 s o la generación agota sus 45 s | Generación fallida, sin más reintentos | `LLM_TIMEOUT` |
| Respuesta que no cumple el esquema | Un reintento; después, generación fallida | `LLM_INVALID_RESPONSE` |
| Contenido bloqueado por los filtros del proveedor | Generación fallida, sin reintento | `LLM_CONTENT_BLOCKED` |
| Proveedor caído o error 5xx | Un reintento; después, generación fallida | `LLM_UNAVAILABLE` |
| Exportar una generación que todavía no tiene especificación | Respuesta 409 | `SPECIFICATION_NOT_READY` |
| Generación en `generating` durante más de 2 minutos | Se marca como fallida al consultarla y al arrancar la API (cubre reinicios e instancias interrumpidas a mitad) | `LLM_TIMEOUT` |

Los errores del proveedor se traducen a errores de dominio en la capa de infraestructura. El frontend muestra un mensaje distinto por código y ofrece reintentar cuando tiene sentido; el reintento reenvía la misma entrada por `POST /projects/:id/generations` y crea una generación nueva. Cada generación que falla por causa del proveedor se envía a Sentry con su código de error, el modelo y el número de intentos.
