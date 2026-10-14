# Requisitos

Requisitos de DevPilot AI con su identificador, cerrados el 9 de octubre de 2026 y revisados el 10, el 11 y el 12 de octubre. La arquitectura está en [architecture.md](architecture.md), el contrato de IA en [ai-contract.md](ai-contract.md) y el modelo de amenazas en [threat-model.md](threat-model.md).

## Alcance del MVP

Siete módulos, construidos por una sola persona, con entrega el 20 de octubre de 2026. El usuario objetivo es un desarrollador individual o un equipo pequeño.

| Módulo | Dentro del MVP | Fuera del MVP |
| --- | --- | --- |
| Autenticación | Registro, inicio y cierre de sesión con email y contraseña; JWT con refresh token | OAuth, recuperación de contraseña por email, verificación de email |
| Proyectos | Crear, listar, editar y eliminar proyectos con su contexto técnico | Proyectos compartidos, roles, equipos |
| Generación con IA | Especificación estructurada a partir de una tarea o bug en lenguaje natural | Streaming de la respuesta, lectura de repositorios, adjuntar archivos |
| Edición manual | Editar cualquier sección de la especificación y guardar | Edición colaborativa, comentarios |
| Historial | Lista de generaciones por proyecto, con estado y fecha; reabrir y regenerar | Comparar versiones (diff) |
| Exportación | Descarga en Markdown y en JSON | PDF, envío a Jira, GitHub Issues o Notion |
| Dashboard | Métricas con gráficas sobre proyectos y generaciones | Métricas de equipo, informes programados |

La interfaz se entrega en español e inglés, con selector de idioma. No hay cuenta de demostración: se accede registrándose, y cada cuenta nueva recibe un proyecto de ejemplo.

## Requisitos funcionales

37 requisitos en siete módulos. Cada uno lleva un criterio de aceptación comprobable.

### Autenticación

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-AUT-01 | Registro con nombre, email y contraseña | Email único; contraseña de 8 caracteres o más; errores mostrados por campo; tras registrarse, la sesión queda iniciada |
| RF-AUT-02 | Inicio de sesión con email y contraseña | Con credenciales incorrectas el mensaje es genérico y no revela si el email existe |
| RF-AUT-03 | Sesión persistente | Access token de 15 min y refresh token de 7 días en cookie httpOnly; la renovación es transparente para el usuario y el refresh token rota en cada uso. El access token vive solo en la memoria del navegador, nunca en `localStorage`; al recargar la página se recupera con `/auth/refresh` |
| RF-AUT-04 | Cierre de sesión | El refresh token queda invalidado en el servidor |
| RF-AUT-05 | Rutas protegidas | Sin sesión se redirige al login; un usuario nunca ve ni modifica recursos de otro (la API responde 404) |

### Proyectos

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-PRO-01 | Crear un proyecto con nombre, descripción, stack tecnológico (etiquetas) y convenciones (texto libre) | Nombre obligatorio de hasta 80 caracteres; descripción de hasta 500; convenciones de hasta 2.000; hasta 15 etiquetas de 30 caracteres como máximo; el proyecto aparece en la lista sin recargar |
| RF-PRO-02 | Listar los proyectos del usuario | Cada tarjeta muestra número de generaciones y última actividad; hay búsqueda por nombre y estado vacío |
| RF-PRO-03 | Ver el detalle de un proyecto | Muestra sus datos y su historial de generaciones |
| RF-PRO-04 | Editar un proyecto | Mismas validaciones que al crear |
| RF-PRO-05 | Eliminar un proyecto | Pide confirmación e informa de que se borran sus generaciones |
| RF-PRO-06 | Proyecto de ejemplo en cada cuenta nueva | Al registrarse, la cuenta recibe un proyecto de ejemplo con una generación completada, creada desde un fichero del repositorio sin llamar al LLM; la generación va marcada como «Ejemplo», se puede eliminar, aparece en el dashboard y no cuenta para los límites de uso |

### Generación con IA

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-GEN-01 | Formulario de generación: tipo (funcionalidad o bug), descripción en lenguaje natural y contexto adicional opcional | Descripción de entre 20 y 4.000 caracteres, con contador visible; contexto adicional de hasta 2.000 caracteres |
| RF-GEN-02 | La IA devuelve una especificación con seis secciones | Descripción técnica, historias de usuario con criterios de aceptación, tareas de frontend y backend, riesgos y casos límite, casos de prueba y estimación de complejidad |
| RF-GEN-03 | El contexto del proyecto se incluye en la petición | Las tareas generadas mencionan el stack y respetan las convenciones declaradas en el proyecto; la misma entrada en dos proyectos con stacks distintos produce tareas distintas |
| RF-GEN-04 | Estados visibles de la generación | Pendiente, generando, necesita aclaración, completada y fallida; «pendiente» existe solo en el frontend, entre el envío y la respuesta 202, y los otros cuatro son los valores de `status`; el botón se deshabilita mientras genera y no hay envíos duplicados |
| RF-GEN-05 | Validación de la respuesta | Si la respuesta no cumple el esquema hay un reintento automático; si vuelve a fallar, la generación queda como fallida con un mensaje claro y un botón de reintento, que reenvía la misma entrada como una generación nueva |
| RF-GEN-06 | Regenerar | Crea una generación nueva con la misma entrada; la anterior se conserva |
| RF-GEN-07 | Límite de uso por usuario | Máximo configurable de generaciones al día (propuesta: 20); al alcanzarlo se explica cuándo se reinicia. Un tope global diario protege la cuota gratuita del modelo. Cada límite responde 429 con su propio código de error |
| RF-GEN-08 | Aviso de privacidad | Texto visible junto al formulario: no pegar código ni datos confidenciales |
| RF-GEN-09 | Preguntas aclaratorias | Si a la descripción le falta información para especificar sin inventar, la IA devuelve entre 2 y 4 preguntas concretas en lugar de la especificación y la generación queda en «necesita aclaración». El usuario responde (hasta 500 caracteres por respuesta, alguna puede quedar en blanco) o pulsa «Generar sin responder»; en ambos casos se genera la especificación. Hay una sola ronda de preguntas, y preguntar y generar cuentan como una única generación para los límites de uso |
| RF-GEN-10 | Supuestos explícitos | La especificación incluye la lista de supuestos que la IA ha tenido que asumir, por ejemplo las preguntas que el usuario dejó sin responder; la vista de la especificación los muestra antes de las seis secciones |

### Edición manual

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-EDI-01 | Editar cualquier sección de la especificación | Se pueden añadir, modificar y eliminar historias, tareas, riesgos y casos de prueba |
| RF-EDI-02 | Guardar los cambios | El contenido editado se valida con el mismo esquema que la respuesta de la IA; la generación queda marcada como «editada» |
| RF-EDI-03 | Conservar el original | La respuesta original de la IA no se sobrescribe y se puede restaurar |
| RF-EDI-04 | Proteger cambios sin guardar | Al salir con cambios pendientes se pide confirmación |

### Historial

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-HIS-01 | Listar las generaciones de un proyecto | Orden de más reciente a más antigua, paginada; cada fila muestra título, tipo, complejidad, estado y fecha |
| RF-HIS-02 | Filtrar y buscar | Filtros por tipo y estado; búsqueda por texto en el título y la descripción |
| RF-HIS-03 | Abrir una generación | Muestra la especificación completa y la entrada que la originó |
| RF-HIS-04 | Eliminar una generación | Pide confirmación |

### Exportación

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-EXP-01 | Exportar a Markdown | Fichero .md con las seis secciones; tareas y criterios de aceptación como listas de casillas |
| RF-EXP-02 | Exportar a JSON | El fichero cumple el esquema público e incluye su número de versión |
| RF-EXP-03 | Copiar al portapapeles | Copia el Markdown y confirma con un aviso |
| RF-EXP-04 | Exportar la versión vigente | Si la especificación fue editada, se exporta la versión editada |

### Dashboard

| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-DAS-01 | Indicadores resumen | Total de proyectos, total de generaciones, porcentaje de generaciones completadas y tiempo medio de generación |
| RF-DAS-02 | Gráfica de actividad | Generaciones por día en los últimos 30 días |
| RF-DAS-03 | Gráfica de complejidad | Reparto de las generaciones por complejidad estimada (S, M, L, XL) |
| RF-DAS-04 | Gráfica por proyecto | Generaciones de los cinco proyectos con más actividad |
| RF-DAS-05 | Gráfica por tipo | Proporción entre funcionalidades y bugs |
| RF-DAS-06 | Filtros y estado vacío | Filtro por periodo (últimos 7, 30 o 90 días) y por proyecto, guardados en la URL; sin datos se muestra una invitación a crear la primera generación |

## Requisitos no funcionales

18 requisitos; los dos primeros son los que el TFM evalúa de forma explícita.

| ID | Área | Requisito |
| --- | --- | --- |
| RNF-01 | Arquitectura del backend | Las dependencias apuntan hacia dentro: `domain` no importa Express, Prisma ni el SDK del LLM, y `application` solo depende de `domain`. `packages/shared`, que solo contiene esquemas Zod y tipos, se puede importar desde cualquier capa. Una regla de lint lo comprueba en CI |
| RNF-02 | Arquitectura del frontend | Atomic Design: átomos y moléculas sin llamadas a la API ni estado global; las páginas componen plantillas y organismos; el acceso a datos vive en `features`, `services` y `hooks` |
| RNF-03 | Tipado | TypeScript en modo estricto en frontend y backend, sin `any` explícitos |
| RNF-04 | Seguridad | Contraseñas con hash bcrypt o argon2; refresh token en cookie httpOnly, Secure y SameSite; frontend y API bajo el mismo origen, sin CORS; cabeceras de seguridad; límite de intentos en los endpoints de autenticación. El detalle por categoría OWASP está en «Seguridad» |
| RNF-05 | Secretos | La clave del LLM y los secretos JWT solo existen como variables de entorno del servidor; nunca llegan al navegador ni al repositorio |
| RNF-06 | Autorización | Toda consulta de proyectos y generaciones filtra por el usuario en sesión |
| RNF-07 | Validación | Todas las entradas de la API se validan con Zod antes de llegar a un caso de uso |
| RNF-08 | Rendimiento | Sin contar un arranque en frío, los endpoints sin IA responden en menos de 500 ms; una generación termina o falla en 45 s como máximo |
| RNF-09 | Experiencia de uso | Cada vista con datos tiene estados de carga, vacío y error; la interfaz es usable desde 360 px de ancho |
| RNF-10 | Accesibilidad | Formularios con etiquetas asociadas, navegación completa por teclado, contraste AA y alternativa textual para cada gráfica |
| RNF-11 | Pruebas | Tests unitarios de todos los casos de uso con repositorios en memoria y `FakeLLMProvider`; tests de integración de los endpoints de autenticación y generación; cobertura mínima del 70 % en `domain` y `application` |
| RNF-12 | Calidad e integración continua | ESLint y Prettier; GitHub Actions ejecuta el pipeline de «Pipeline de CI/CD» y ningún cambio llega a `develop` ni a `main` sin el CI en verde |
| RNF-13 | Coste | 0 € al mes con uso de demostración |
| RNF-14 | Internacionalización | Interfaz completa en español e inglés: idioma inicial según el navegador, selector visible y preferencia recordada; los mensajes de error se traducen en el frontend a partir de su código; fechas y números siguen el formato del idioma activo |
| RNF-15 | Monitorización de errores | Sentry captura los errores no controlados del frontend, con un error boundary de React, y de la API. Cada evento lleva entorno y versión; los source maps se suben en el build; un error nuevo en producción avisa por email. Los errores esperados (validación, 401, 404, límite de uso) no se envían. Sin DSN configurado, Sentry queda desactivado, como en local y en los tests |
| RNF-16 | Privacidad en la monitorización | A Sentry no llegan contraseñas, tokens, emails ni el texto que el usuario escribe para generar; el usuario se identifica solo por su id. Session Replay queda desactivado y el muestreo de trazas se limita para no agotar la cuota |
| RNF-17 | Documentación de la API | La especificación OpenAPI se genera desde los esquemas Zod y nunca se escribe a mano. Cubre los 20 endpoints con sus peticiones, respuestas, códigos de error y autenticación por token. La generación vive en la capa `presentation`. El CI falla si la especificación no es válida o si algún endpoint queda sin documentar |
| RNF-18 | Catálogo de componentes | Storybook sigue la jerarquía de Atomic Design. Cada átomo y cada molécula tiene historias con sus variantes y estados: por defecto, deshabilitado, error y cargando. Los organismos se muestran con datos simulados y sin llamar a la API. Incluye controles de propiedades, comprobación de accesibilidad y selector de idioma. El CI falla si una historia no compila |

## Seguridad

La seguridad se decide en el diseño y viene activada de serie. El diseño aplica tres decisiones de fondo: defensa en capas, el modelo tratado como componente no fiable y sin capacidad de actuar, y fallo seguro ante cualquier error.

### Principios

| ID | Principio | Requisito | Cómo se comprueba |
| --- | --- | --- | --- |
| SEG-15 | Denegar por defecto | La autenticación es global y las rutas públicas son una lista explícita; una ruta nueva nace protegida | Test: una ruta sin declarar como pública responde 401 sin token |
| SEG-16 | Sin secretos por defecto | En producción la API se niega a arrancar con los valores de ejemplo de `.env.example` o de Docker Compose, o con secretos débiles. El seed no crea usuarios en producción: solo carga datos en una cuenta existente | Test de arranque con un secreto de ejemplo; test del seed en modo producción |
| SEG-17 | Excepciones explícitas | Swagger UI y la especificación OpenAPI vienen desactivadas y solo se activan con una variable de entorno | Test: sin la variable, `/api/docs` y `/api/openapi.json` responden 404 |
| SEG-18 | Mínimo privilegio | La API se conecta a la base de datos con un usuario sin permisos de administración; las migraciones usan otro rol desde el pipeline; los workflows tienen permisos de solo lectura salvo donde haga falta | Revisión de roles en Supabase y del bloque `permissions` de cada workflow |

### Proceso por fases (SSDLC)

| Fase | Actividad de seguridad | Evidencia |
| --- | --- | --- |
| Requisitos | Requisitos de seguridad con criterio de comprobación | SEG-01 a SEG-19 en este documento |
| Diseño | Modelo de amenazas antes de programar | `docs/threat-model.md`, enlazado desde el README |
| Implementación | Validación en la frontera, reglas de lint de seguridad, análisis estático y detección de secretos (SEG-19) | Alertas de seguridad de GitHub sin incidencias altas abiertas |
| Verificación | Un test por requisito de seguridad; auditoría de dependencias | Jobs de `ci.yml` |
| Despliegue | Ramas protegidas, producción solo desde el pipeline, secretos en GitHub Actions | `deploy.yml` y protección de `develop` y `main` |
| Operación | Monitorización de errores, registro de eventos de seguridad, Dependabot y canal para avisar de vulnerabilidades | Sentry, registros de la API y `SECURITY.md` |

SEG-19 completa la fase de implementación: el repositorio tiene activos el análisis de código con CodeQL y la detección de secretos con bloqueo en el push, e incluye un `SECURITY.md`. Quedan como prescindibles el análisis dinámico sobre la aplicación desplegada y el escaneo de la imagen Docker.

### OWASP Top 10:2025

Cada categoría del [OWASP Top 10:2025](https://owasp.org/Top10/2025/) tiene un requisito y una forma de comprobarlo.

| ID | Categoría OWASP | Requisito | Cómo se comprueba |
| --- | --- | --- | --- |
| SEG-01 | A01 Broken Access Control | Toda consulta filtra por el usuario en sesión y un recurso ajeno responde 404 | Test de integración: un usuario recibe 404 al leer, editar, exportar o borrar proyectos y generaciones de otro |
| SEG-02 | A02 Security Misconfiguration | Frontend y API bajo el mismo origen, sin cabeceras CORS; cabeceras de seguridad; respuestas de la API con `Cache-Control: no-store`; ninguna traza ni detalle interno en las respuestas de producción; tamaño máximo de petición de 100 KB; la API no arranca si falta o es inválida una variable de entorno | Tests de arranque con configuración incompleta y de cabeceras de la API; revisión de cabeceras sobre el despliegue |
| SEG-03 | A03 Software Supply Chain Failures | Lockfile en el repositorio e instalación reproducible; auditoría de dependencias en el CI, que falla con vulnerabilidades altas o críticas; Dependabot activo; acciones de GitHub e imagen base de Docker con versión fijada | Job de auditoría en `ci.yml` |
| SEG-04 | A04 Cryptographic Failures | Contraseñas con bcrypt o argon2; JWT con algoritmo fijado y secretos aleatorios de 32 bytes o más, distintos para access y refresh; HTTPS en todo el tráfico y TLS en la conexión a la base de datos, que la API exige al arrancar en producción; refresh token guardado como hash | Test: un token firmado con otro algoritmo o sin firma se rechaza |
| SEG-05 | A05 Injection | Zod en todas las entradas; consultas parametrizadas con Prisma, sin SQL construido a mano; el texto del usuario y la salida del LLM se muestran siempre como texto, nunca como HTML; el Markdown exportado escapa el contenido | Test: una descripción con una etiqueta script se muestra literal; regla de lint que prohíbe `dangerouslySetInnerHTML` |
| SEG-06 | A06 Insecure Design | Límites de uso por usuario, tope global y mensajes de login genéricos; un modelo de amenazas breve, con activos, actores y mitigaciones, se redacta el primer día, antes de programar | Documento `docs/threat-model.md`, enlazado desde el README |
| SEG-07 | A07 Authentication Failures | Límite de intentos en autenticación; access token de 15 min; el refresh token rota en cada uso y, si se reutiliza uno ya usado, se revocan todas las sesiones del usuario; el registro rechaza las contraseñas más comunes | Tests de rotación y de reutilización del refresh token |
| SEG-08 | A08 Software or Data Integrity Failures | Código y migraciones llegan a producción solo por el pipeline y desde `main` protegida; la respuesta del LLM se valida con el esquema antes de guardarse | Protección de rama activa; test de respuesta inválida del modelo |
| SEG-09 | A09 Security Logging and Alerting Failures | Registro estructurado de eventos de seguridad: login fallido, reutilización de refresh token, acceso denegado y límite alcanzado, con fecha, id de usuario e IP, sin contraseñas ni tokens; la reutilización de un refresh token y los picos de logins fallidos generan una alerta en Sentry | Test: cada evento deja su línea de registro |
| SEG-10 | A10 Mishandling of Exceptional Conditions | Un manejador global convierte cualquier error inesperado en una respuesta 500 genérica y lo envía a Sentry; ante un fallo se deniega el acceso; las operaciones con varias escrituras van en una transacción; toda llamada externa tiene tiempo máximo | Test: un error forzado en un caso de uso no filtra detalles ni deja datos a medias |

### Riesgos propios del LLM

De la lista [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) aplican cuatro riesgos. El resto no aplica: el modelo no tiene herramientas, memoria, entrenamiento propio ni base vectorial.

| ID | Riesgo | Requisito | Cómo se comprueba |
| --- | --- | --- | --- |
| SEG-11 | Prompt Injection | El texto del usuario va delimitado como dato; las instrucciones del sistema son fijas; el modelo no ejecuta acciones, solo devuelve JSON | Test con una entrada que pide ignorar las instrucciones: la salida sigue cumpliendo el esquema |
| SEG-12 | Sensitive Information Disclosure | El prompt contiene solo el proyecto y el texto del usuario en sesión; nunca secretos, configuración interna ni datos de otros usuarios | Test unitario del constructor del prompt |
| SEG-13 | Unbounded Consumption | Límite por usuario, tope global diario, longitud máxima en todo texto que entra en el prompt (RF-GEN-01 y RF-PRO-01), tope de tokens de salida y tiempo máximo de 45 s por generación, reintentos incluidos | Tests de cada límite |
| SEG-14 | Improper Output Handling | La salida se valida con el esquema, se guarda como dato y se muestra como texto; nunca se ejecuta ni se interpreta como HTML | El mismo test que SEG-05 |

## Pipeline de CI/CD

GitHub Actions valida cada pull request y despliega a producción solo desde `main` y solo con el CI en verde. El trabajo se integra en `develop` y pasa a `main` al cerrar cada bloque.

| Workflow | Se dispara con | Qué hace |
| --- | --- | --- |
| `ci.yml` | Cada pull request y cada push a `develop` o a `main` | Lint y formato, incluida la regla de dependencias entre capas; comprobación de tipos; tests de la API con PostgreSQL en un contenedor de servicio; tests del frontend; build del frontend y de la imagen Docker de la API. El día 17 se añaden el build de Storybook, la validación de la especificación OpenAPI y la auditoría de dependencias |
| `deploy.yml` | CI en verde sobre `main` | En este orden: migraciones de Prisma contra Supabase, despliegue de la API y del frontend en Vercel, registro de la versión y subida de source maps a Sentry, publicación de Storybook, y comprobación de `/health` y de la página de inicio |
| `release.yml` | Una etiqueta `v*` | Crea la release de GitHub con sus notas; la entrega es `v1.0.0` |

Reglas del pipeline:

- **Un solo camino a producción.** Cuando exista `deploy.yml`, los despliegues automáticos de Vercel sobre `main` se desactivan; despliega el workflow, con la CLI de Vercel. Hasta entonces, Vercel despliega por su cuenta desde `main`.
- **Ramas protegidas.** `develop` y `main` exigen pull request con el CI en verde y no admiten push directo. Las ramas de trabajo (`feature/…`, `fix/…`, `chore/…`) salen de `develop` y vuelven a ella; `develop` pasa a `main` con un merge commit al cerrar cada bloque.
- **Sin llamadas al LLM.** Los tests usan `FakeLLMProvider`; la clave de Gemini no se guarda en GitHub.
- **Secretos.** La URL de la base de datos y los tokens de Vercel y Sentry están en GitHub Actions Secrets, nunca en el repositorio.
- **Migraciones primero.** Cada migración es compatible con la versión anterior de la API, porque la base de datos cambia antes que el código.
- **Rapidez.** Caché de dependencias y cancelación de ejecuciones obsoletas de la misma rama; el CI termina en menos de 5 minutos.
- **Despliegue fallido.** Si la comprobación final falla, el workflow queda en rojo y se vuelve a la versión anterior desde el panel de Vercel.

## Entregables

Siete piezas; el proyecto está terminado cuando las siete cumplen su criterio.

| Entregable | Contenido | Criterio de aceptación |
| --- | --- | --- |
| Aplicación desplegada | Frontend y API en Vercel, base de datos en Supabase | URL pública con HTTPS; el recorrido completo funciona con una cuenta recién registrada: registrarse, ver el proyecto de ejemplo, crear proyecto, generar, editar, exportar y ver el dashboard |
| Repositorio | Monorepo con `apps/web`, `apps/api` y `packages/shared`; Conventional Commits; `develop` y `main` protegidas y cambios por pull request; `.gitignore`, licencia y ningún secreto en el historial | CI en verde en la rama principal y etiqueta `v1.0.0` en el commit entregado |
| Docker | Dockerfile de la API, Dockerfile del frontend y `docker-compose.yml` con API, PostgreSQL y web | `docker compose up` deja la aplicación funcionando en local con migraciones y datos de demostración aplicados |
| README técnico | En la raíz, en inglés (`README.md`) y en español (`README.es.md`), enlazados entre sí: descripción y enlaces a la aplicación desplegada, a Swagger UI y a Storybook, capturas, diagrama de arquitectura y regla de dependencias, estructura de carpetas, decisiones técnicas, modelo de amenazas, contrato de IA, variables de entorno, ejecución en local, tests, despliegue y limitaciones conocidas | Una persona ajena al proyecto lo levanta en local siguiendo solo el README; las dos versiones dicen lo mismo |
| Datos de demostración | Script de seed repetible: 3 proyectos y unas 25 generaciones repartidas en 30 días, con distintos tipos, complejidades y estados, alguna editada y alguna fallida. En local crea un usuario de ejemplo; en producción se ejecuta una vez sobre la cuenta del autor y no crea usuarios. Cada cuenta nueva recibe además un proyecto de ejemplo (RF-PRO-06) | En local y en la cuenta del autor, el dashboard muestra las cuatro gráficas con datos nada más entrar; el seed no consume cuota del LLM porque las especificaciones van guardadas en el repositorio |
| Slides | Problema y usuario objetivo, recorrido por cada apartado, Atomic Design, Clean Architecture, contrato de IA y gestión de errores, despliegue y limitaciones | Cada uno de los siete módulos y cada capa de la arquitectura tiene al menos una diapositiva con captura o diagrama |
| Vídeo | Demostración visual de cada apartado sobre la aplicación desplegada, y explicación del código siguiendo una generación de extremo a extremo | Se ven funcionando los siete módulos, incluido un error de generación y su reintento; el recorrido de código pasa por las cuatro capas del backend y por los cinco niveles de Atomic Design |

El repositorio incluye un `.env.example` con todas las variables y sin valores reales.

## Prioridades

Lo imprescindible basta para entregar un TFM completo; lo demás suma nota y portfolio, pero nunca a costa de lo primero.

| Nivel | Funcionales | No funcionales y seguridad | Pipeline y entregables |
| --- | --- | --- | --- |
| Imprescindible | RF-AUT-01 a 05; RF-PRO-01 a 05; RF-GEN-01 a 05 y 07 a 10; RF-HIS-01 y 03; RF-EXP-01; RF-DAS-01 a 03 | RNF-01 a 07, 09, 11, 12 y 13; SEG-01, 02, 04 a 06 y 10 a 17 | `ci.yml` con sus jobs base; aplicación desplegada, repositorio, Docker, README en español, datos de demostración, slides y vídeo |
| Importante | RF-PRO-06; RF-GEN-06; RF-EDI-01, 02 y 04; RF-HIS-04; RF-EXP-02 a 04; RF-DAS-04 y 06 | RNF-08, 10 y 14 a 18, con Storybook solo para átomos y moléculas; SEG-03, 07 a 09, 18 y 19 | `deploy.yml`; jobs de Storybook, OpenAPI y auditoría en `ci.yml`; README en inglés |
| Prescindible | RF-EDI-03; RF-HIS-02; RF-DAS-05 | Storybook de organismos; rechazo de contraseñas comunes; alerta por picos de logins fallidos; análisis dinámico; escaneo de la imagen Docker | `release.yml` |

Son 25 requisitos funcionales imprescindibles, 11 importantes y 3 prescindibles. Tres reglas ordenan el trabajo:

- **Orden estricto.** No se empieza nada importante hasta que lo imprescindible esté desplegado y probado.
- **Despliegue sencillo al principio.** Hasta que exista `deploy.yml`, Vercel despliega por su cuenta desde `main`.
- **Traducciones preparadas.** Los textos van a ficheros de traducción desde el primer día; solo la traducción al inglés es importante.

## Plan de trabajo

El código se cierra el 18 de octubre y la entrega es el 20. Lo imprescindible queda desplegado el día 15 y lo importante ocupa los tres días siguientes.

| Día | Bloque | Nivel |
| --- | --- | --- |
| 10 | Base: repo, Docker, CI y despliegue. Modelo de amenazas | Imprescindible |
| 11 | Autenticación y átomos base | Imprescindible |
| 12 | Proyectos e historial | Imprescindible |
| 13–14 | Generación con IA y errores | Imprescindible |
| 15 | Dashboard, exportación y datos de ejemplo (seed). Hito: imprescindible desplegado | Imprescindible |
| 16 | Proyecto de ejemplo, edición, regenerar y exportación | Importante |
| 17 | Inglés, OpenAPI, Storybook y Sentry | Importante |
| 18 | README, seguridad y cierre | Cierre |
| 19 | Slides y vídeo | Entrega |
| 20 | Entrega | Entrega |

Cada día termina con su bloque desplegado, no solo funcionando en local. Cada bloque llega con sus tests.

Si el día 15 lo imprescindible no está desplegado, los días 16 y 17 se dedican a terminarlo y lo importante se recorta empezando por el final: Sentry, Storybook, OpenAPI e inglés, en ese orden. Lo prescindible solo se aborda si sobra tiempo el día 18.
