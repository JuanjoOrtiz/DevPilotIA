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

Las seis secciones que ve el usuario (RF-GEN-02) son: descripción técnica, historias de usuario con criterios de aceptación, tareas de frontend y backend, riesgos y casos límite, casos de prueba y estimación de complejidad.

## Entrada

| Campo | Regla |
| --- | --- |
| `type` | `feature` o `bug` |
| `inputText` | Entre 20 y 4.000 caracteres |
| `additionalContext` | Opcional; hasta 2.000 caracteres |
| Contexto del proyecto | Nombre (80 caracteres), descripción (500), convenciones (2.000) y hasta 15 etiquetas de stack de 30 caracteres; lo añade el servidor, no el cliente |

El idioma de la especificación generada sigue al idioma del texto que escribe el usuario.

## Flujo de una generación

1. La API valida la entrada y comprueba el límite diario del usuario.
2. Crea la generación en estado `generating` y responde 202 con su identificador.
3. En segundo plano construye el prompt: instrucciones fijas, contexto del proyecto y el texto del usuario delimitado como dato.
4. Llama al proveedor con el esquema de salida, temperatura baja y un tiempo máximo de 20 segundos por intento.
5. Valida la respuesta con Zod. Si no es válida, reintenta una vez indicando al modelo el error de validación.
6. Guarda la especificación y pasa a `completed`, o guarda el código de error y pasa a `failed`.
7. El frontend consulta el estado cada 2 segundos hasta que deja de ser `generating`.

La generación entera, reintentos incluidos, termina o falla en 45 segundos (RNF-08); los dos tiempos se ajustan por variable de entorno. Antes de recibir el 202, el frontend muestra un estado «pendiente» que no existe en el modelo de datos.

Cada generación registra modelo, número de intentos, duración y tokens consumidos; de ahí salen las métricas del dashboard.

## Reglas del prompt

- Las instrucciones del sistema son fijas y no incluyen texto del usuario (SEG-11).
- El texto del usuario va delimitado como dato, separado de las instrucciones (SEG-11).
- El prompt contiene solo el proyecto y el texto del usuario en sesión; nunca secretos, configuración interna ni datos de otros usuarios (SEG-12).
- El modelo no tiene herramientas ni ejecuta acciones: solo devuelve JSON.
- La salida se guarda como dato y se muestra como texto; nunca se ejecuta ni se interpreta como HTML (SEG-14).

El texto literal de las instrucciones del sistema está pendiente de redactar; se añadirá aquí cuando se implemente la generación (días 13 y 14).

## Límites

| Límite | Valor |
| --- | --- |
| Generaciones por usuario y día | Configurable; propuesta: 20 |
| Tope global diario | Protege la cuota gratuita del modelo |
| Tamaño de la entrada | Descripción de 4.000 caracteres y contexto adicional de 2.000 |
| Tokens de salida | Con tope |
| Tiempo máximo | 20 segundos por intento y 45 por generación |
| Generación de ejemplo | No llama al modelo ni cuenta para ningún límite |

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
| Generación en `generating` durante más de 2 minutos | Se marca como fallida al consultarla y al arrancar la API (cubre reinicios del servidor) | `LLM_TIMEOUT` |

Los errores del proveedor se traducen a errores de dominio en la capa de infraestructura. El frontend muestra un mensaje distinto por código y ofrece reintentar cuando tiene sentido; el reintento reenvía la misma entrada por `POST /projects/:id/generations` y crea una generación nueva. Cada generación que falla por causa del proveedor se envía a Sentry con su código de error, el modelo y el número de intentos.
