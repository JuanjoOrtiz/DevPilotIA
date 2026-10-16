# Despliegue

La aplicación se despliega en dos servicios gratuitos que no piden tarjeta: la base de datos en Supabase y, en Vercel, la API y el frontend como dos proyectos distintos. Se configuran en ese orden, porque cada paso necesita un dato del anterior.

Por qué la API está en Vercel y no en un hosting de contenedores se explica en [architecture.md](architecture.md).

## 1. Base de datos en Supabase

De Supabase se usa solo su PostgreSQL. La autenticación, el almacenamiento y la API de datos de Supabase no se usan.

1. Crea un proyecto en la región «Central EU (Frankfurt)», que es donde se ejecuta la API. En la sección «Security» del formulario:
   - Desmarca «Enable Data API» y «Automatically expose new tables». Con la API de datos activa, las tablas del esquema `public` son accesibles por REST con la clave pública del proyecto, sin pasar por DevPilot (amenaza T-25).
   - Marca «Enable automatic RLS». Es una segunda barrera por si alguien reactiva la API de datos; a DevPilot no le afecta, porque su rol es el dueño de las tablas.
2. Genera una contraseña larga y sin símbolos, para no tener que codificarla en la URL:

   ```bash
   openssl rand -hex 24
   ```

3. Crea un rol propio para la aplicación. En el editor SQL, sustituye la contraseña y ejecuta:

   ```sql
   create user "prisma" with password 'CAMBIA_ESTA_CONTRASEÑA' bypassrls createdb;
   grant "prisma" to "postgres";
   grant usage on schema public to prisma;
   grant create on schema public to prisma;
   grant all on all tables in schema public to prisma;
   grant all on all routines in schema public to prisma;
   grant all on all sequences in schema public to prisma;
   alter default privileges for role postgres in schema public grant all on tables to prisma;
   alter default privileges for role postgres in schema public grant all on routines to prisma;
   alter default privileges for role postgres in schema public grant all on sequences to prisma;
   ```

   Para cambiar la contraseña más adelante: `alter user "prisma" with password 'LA_NUEVA';`.

4. Copia la cadena de conexión: botón «Connect», pestaña «Direct», opción «Session pooler» (puerto 5432). En el panel es de solo lectura; pégala en un editor y haz tres cambios:

   | Supabase la da así          | Tiene que quedar así                                       |
   | --------------------------- | ---------------------------------------------------------- |
   | `postgres.abcdefghijklmnop` | `prisma.abcdefghijklmnop`                                  |
   | `[YOUR-PASSWORD]`           | la contraseña del paso 2, sin corchetes                    |
   | termina en `/postgres`      | termina en `/postgres?sslmode=require&uselibpqcompat=true` |

   El resultado tiene esta forma, con el identificador y el host de tu proyecto:

   ```
   postgresql://prisma.abcdefghijklmnop:CONTRASEÑA@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true
   ```

   - En la cadena no puede quedar ningún corchete: Prisma los toma por una dirección IPv6 y falla con el error P1013.
   - `sslmode=require&uselibpqcompat=true` cifra la conexión sin verificar el certificado del servidor. Sin `uselibpqcompat=true`, el driver intenta verificarlo y falla, porque el certificado de Supabase no está entre los de confianza del sistema.
   - No vale la conexión directa (`db.[REF].supabase.co`): solo funciona por IPv6, y Vercel y GitHub Actions salen por IPv4.

5. Aplica las migraciones desde tu máquina, en la raíz del repositorio:

   ```bash
   export DATABASE_URL='la-cadena-anterior'
   npm run db:deploy
   ```

   Debe terminar con «All migrations have been successfully applied».

Esa cadena es un secreto: va en tu terminal y en el panel de Vercel, nunca en el repositorio, en una captura ni en un chat.

## 2. API en Vercel

`apps/api/vercel.json` fija lo que Vercel necesita: que es una aplicación Express, la región de Fráncfort (`fra1`), cómo instalar y compilar el monorepo y que el resultado está en `dist`. En el panel solo hay que indicar la carpeta y el secreto.

1. En Vercel, «Add New» y «Project»; importa el repositorio y llámalo, por ejemplo, `devpilot-api`.
2. En «Root Directory» elige `apps/api`. No cambies los comandos de instalación ni de compilación.
3. En «Environment Variables» añade estas cinco y pulsa «Deploy»:

   | Variable             | Valor                                                |
   | -------------------- | ---------------------------------------------------- |
   | `DATABASE_URL`       | La cadena de Supabase                                |
   | `JWT_ACCESS_SECRET`  | El resultado de `openssl rand -base64 48`            |
   | `JWT_REFRESH_SECRET` | Otro resultado distinto de `openssl rand -base64 48` |
   | `LLM_PROVIDER`       | `gemini`                                             |
   | `GEMINI_API_KEY`     | La clave de Google AI Studio                         |

   Opcionales: `GEMINI_MODEL` (por defecto, `gemini-3.5-flash-lite`: una versión fija y no un alias como `gemini-flash-latest`, que Google cambia sin aviso y que en octubre de 2026 respondía 503 por saturación; los modelos 2.5 ya no existen), `GENERATION_DAILY_LIMIT_PER_USER` (20), `GENERATION_DAILY_LIMIT_GLOBAL` (200), los límites de intentos `AUTH_LOGIN_LIMIT_PER_EMAIL` (5), `AUTH_LOGIN_LIMIT_PER_IP` (20) y `AUTH_REGISTER_LIMIT_PER_IP` (10), y `SENTRY_DSN` (ver «Monitorización con Sentry»). Ajusta el tope global a la cuota diaria gratuita del modelo elegido, que se consulta en Google AI Studio: una generación con preguntas hace dos llamadas, y cada reintento, una más.

   No añadas `NODE_ENV`. En Vercel la API arranca siempre en modo producción (`loadVercelEnv` en `index.ts`), y con `NODE_ENV=production` en el panel `npm ci` deja fuera las dependencias de desarrollo y la compilación falla.

4. Cuando termine, entra en «Settings» y «Environment Variables», edita las cinco y déjalas solo en el entorno «Production». Así las vistas previas de los pull requests no pueden tocar la base de datos real ni firmar sesiones válidas (amenaza T-28).
5. En «Settings» y «Git», cambia «Production Branch» a `main`. Vercel toma por defecto la rama por defecto de GitHub, que es `develop`: sin este cambio, producción sería lo que se integra y no lo que se publica.
6. Anota la URL de producción del proyecto, del tipo `https://devpilot-api.vercel.app`, y comprueba que responde:

   ```bash
   curl https://TU-PROYECTO-API.vercel.app/api/v1/health
   # {"status":"ok","database":"up","version":"<commit>"}
   ```

Si responde con un error 500, abre «Logs» en el proyecto: la API dice qué variable falta o es inválida, nunca su valor. En producción rechaza las credenciales y los secretos de ejemplo, una `DATABASE_URL` sin `sslmode` y dos secretos JWT iguales o de menos de 32 bytes, y un `LLM_PROVIDER` distinto de `gemini` o sin `GEMINI_API_KEY`.

Cambiar un secreto JWT cierra todas las sesiones abiertas: los tokens ya emitidos dejan de valer.

Si los registros muestran errores de «max clients», el pooler en modo sesión se ha quedado sin conexiones. La salida es usar en Vercel la cadena del «Transaction pooler» (puerto 6543), que Supabase recomienda para funciones, y dejar la del modo sesión para las migraciones. No se ha probado todavía con este proyecto.

## 3. Frontend en Vercel

1. En `apps/web/vercel.json`, sustituye el destino de la primera regla por la URL de la API y llévalo a `main` por el camino habitual, con un pull request a `develop` y otro de `develop` a `main`:

   ```json
   { "source": "/api/:path*", "destination": "https://TU-PROYECTO-API.vercel.app/api/:path*" }
   ```

2. En Vercel, importa otra vez el mismo repositorio como un proyecto nuevo, por ejemplo `devpilot-web`, y fija «Root Directory» en `apps/web`. El framework es Vite, con sus valores por defecto. No necesita variables de entorno salvo las de Sentry, que son opcionales (ver «Monitorización con Sentry»).
3. Como en la API, en «Settings» y «Git» cambia «Production Branch» a `main`.
4. Abre la URL del proyecto: debe aparecer el inicio de sesión. Crea una cuenta, crea un proyecto y genera una especificación.

A partir de aquí, Vercel despliega los dos proyectos con cada cambio en `main` y crea una vista previa de cada pull request y de la rama `develop`. La vista previa del frontend habla con la API de producción; la de la API no tiene base de datos.

## 4. Proteger `main` y `develop`

El repositorio tiene dos ramas permanentes: `develop`, donde se integra el trabajo, y `main`, que es lo que está desplegado.

En GitHub, en «Settings», «Rules» y «Rulesets», crea un «branch ruleset» activo, sin nadie en la lista de excepciones. En «Target branches» incluye la rama por defecto y, con «Include by pattern», `develop`:

- Impedir el borrado y el push forzado, que vienen marcados por defecto. Así `develop` no se borra al fusionarla en `main`.
- Exigir pull request antes de fusionar, con cero aprobaciones obligatorias: con una sola persona no habría quien aprobase.
- Exigir que pasen las comprobaciones «Lint, tipos, tests y build», «OpenAPI y Storybook» e «Imagen Docker de la API». Se buscan con ese nombre, sin el prefijo «CI /».

Si se renombra un job de `ci.yml`, hay que actualizar la regla.

El pull request de `develop` a `main` se fusiona siempre con «Create a merge commit». Con «Squash and merge» las dos ramas dejan de compartir historia y el siguiente pull request muestra conflictos y commits repetidos.

## 5. Seguridad del repositorio y del pipeline

Lo que vive en el repositorio ya está hecho: `npm audit` en el CI, `.github/dependabot.yml`, las actions fijadas a un commit, permisos de solo lectura en los workflows y `SECURITY.md`. Lo que se activa en GitHub, en «Settings» y «Advanced Security» (o «Code security»):

1. **Dependabot alerts** y **Dependabot security updates**: avisan de una vulnerabilidad nueva y abren el pull request que la corrige (SEG-03).
2. **CodeQL analysis**, con «Default setup»: analiza el código en cada pull request (SEG-19).
3. **Secret Protection** y **Push protection**: rechazan un push que contenga una clave reconocible (SEG-19, amenaza T-13).
4. **Private vulnerability reporting**: el canal que indica `SECURITY.md`.

### `deploy.yml`: migraciones y comprobación

Vercel sigue compilando y publicando los dos proyectos con cada merge en `main`. `deploy.yml` hace lo que Vercel no hace:

- Al abrir o actualizar el pull request de `develop` a `main`, aplica las migraciones pendientes en Supabase. Así la base de datos cambia **antes** que el código, como exige la regla «Migraciones primero». Toda migración tiene que ser compatible con la versión desplegada.
- Tras el merge, vuelve a aplicarlas (si no hay ninguna pendiente no hace nada) y espera hasta 10 minutos a que `/api/v1/health` responda con el commit nuevo y la base de datos activa. Después comprueba que la página de inicio carga.

Para activarlo, en «Settings» y «Environments», crea el entorno `production` con:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Secret | `DATABASE_URL` | La cadena del rol que aplica las migraciones (`prisma`) |
| Variable | `PRODUCTION_URL` | La URL del frontend, sin barra final: `https://dev-pilot-web.vercel.app` |

Sin el secreto o sin la variable, el paso correspondiente se salta con un aviso y no falla. Con el workflow activo, las migraciones ya no se aplican a mano.

### Mínimo privilegio en la base de datos (SEG-18)

La API no necesita crear ni borrar tablas, solo leer y escribir filas. Con un rol propio para la API, un fallo en la aplicación no puede alterar el esquema, y las migraciones siguen con `prisma` desde el pipeline. Probado en local con RLS activa: el rol no puede crear tablas ni borrar la de usuarios, y el recorrido completo de la aplicación funciona.

1. Genera otra contraseña con `openssl rand -hex 24` y, en el editor SQL de Supabase, ejecuta:

   ```sql
   create user "devpilot_app" with password 'CAMBIA_ESTA_CONTRASEÑA' bypassrls;
   grant usage on schema public to devpilot_app;
   grant select, insert, update, delete on all tables in schema public to devpilot_app;
   grant usage, select on all sequences in schema public to devpilot_app;
   alter default privileges for role prisma in schema public
     grant select, insert, update, delete on tables to devpilot_app;
   alter default privileges for role prisma in schema public
     grant usage, select on sequences to devpilot_app;
   revoke all on table _prisma_migrations from devpilot_app;
   ```

   `bypassrls` hace falta porque las tablas tienen RLS activa («Enable automatic RLS») y DevPilot no usa políticas: el aislamiento entre usuarios lo hace la API. Las dos últimas órdenes `alter default privileges` dan los mismos permisos sobre las tablas que creen migraciones futuras.

2. En el proyecto de la API de Vercel, cambia `DATABASE_URL` por la misma cadena con `devpilot_app.abcdefghijklmnop` y la contraseña nueva, y vuelve a desplegar.
3. Comprueba `/api/v1/health` y entra en la aplicación. Si algo falla, vuelve a poner la cadena de `prisma`: no se ha borrado nada.

La cadena de `prisma` queda solo en el secreto de GitHub y en tu gestor de contraseñas.

## Cambios en la base de datos

Con `deploy.yml` activo, las migraciones se aplican solas al abrir el pull request de `develop` a `main`. Sin él, se aplican a mano y **antes** de pasar a `main` el código que las necesita:

```bash
npm run db:migrate                                    # en local: crea la migración y la aplica
DATABASE_URL='cadena-de-supabase' npm run db:deploy   # en producción
```

Cada migración debe ser compatible con la versión de la API que está desplegada.

## Documentación de la API

Swagger UI y la especificación OpenAPI vienen desactivadas (SEG-17). Para verlas en producción, añade en el proyecto de la API de Vercel la variable `API_DOCS_ENABLED=true` y vuelve a desplegar: quedan en `https://<web>/api/docs` y `https://<web>/api/openapi.json`. Para retirarlas, borra la variable y despliega de nuevo. En local basta ponerla en `.env`.

## Datos de demostración en producción

El seed carga 3 proyectos y 25 generaciones en **una cuenta ya registrada**; en producción nunca crea usuarios (SEG-16). Detalles en `docs/architecture.md`, «Datos de demostración (seed)».

1. Regístrate en la aplicación desplegada con la cuenta que vas a usar en la demostración.
2. Desde la raíz del repositorio, con la cadena de Supabase del paso 4 del apartado 1:

   ```bash
   DATABASE_URL='cadena-de-supabase' SEED_EMAIL='tu-email' npm run db:seed
   ```

   Debe terminar con «Seed (production): 3 projects and 25 generations for an existing account.». Si el email no tiene cuenta, falla sin crear nada.

Se puede repetir: borra los tres proyectos de ejemplo de esa cuenta y los vuelve a crear con fechas de los últimos 30 días, así que conviene ejecutarlo de nuevo el día antes de la demostración. No toca tus otros proyectos.

En local basta `npm run db:seed`: crea `demo@example.com` con la contraseña `devpilot-demo` si no existe.

## Monitorización con Sentry

Sin DSN no se envía nada a Sentry, así que todo funciona igual sin este apartado.

1. En [sentry.io](https://sentry.io), con el plan Developer gratuito, crea dos proyectos: uno de plataforma «Node.js» (Express) para la API y otro «React» para el frontend. Elige la región de datos de la UE si te la ofrece.
2. En cada proyecto, «Settings», «Client Keys (DSN)», copia el DSN. Un DSN no es un secreto: solo permite enviar eventos.
3. En el proyecto de la API de Vercel añade `SENTRY_DSN` con el DSN de Node.js.
4. En el proyecto web de Vercel añade `VITE_SENTRY_DSN` con el DSN de React. Se lee al compilar, así que hace falta volver a desplegar.
5. Para que los errores del frontend se lean con el código original, en el proyecto web añade además `SENTRY_ORG` y `SENTRY_PROJECT` (los nombres cortos de la organización y del proyecto React) y `SENTRY_AUTH_TOKEN`, un «Organization Auth Token» creado en «Settings», «Auth Tokens». **Ese token sí es un secreto**: solo en el panel de Vercel, en el entorno «Production». El build sube los source maps y después los borra, así que no se publican.
6. Deja las tres variables de Sentry del proyecto web y `SENTRY_DSN` solo en «Production», como el resto (amenaza T-28): las vistas previas no envían eventos.
7. Alertas, en «Alerts» de cada proyecto:
   - La regla por defecto «A new issue is created» avisa por email de cada error nuevo (RNF-15). Comprueba que existe.
   - En el proyecto de la API, una regla de «Issues» que avise cuando el evento con mensaje `Refresh token reuse` aparezca una vez, y otra cuando `Login attempts limit reached` aparezca más de 3 veces en una hora: son las alertas de SEG-09.

Para comprobarlo, en Sentry, «Issues», debe aparecer el primer evento real; para forzar uno sin tocar el código, el aviso de `Login attempts limit reached` sale con seis logins fallidos seguidos con el mismo email.

## Límite de intentos e IP del visitante

El login y el registro se limitan por email y por IP (SEG-07). La migración `20261015000000_auth_attempts` crea su tabla, y se aplica antes de pasar el código a `main`, como cualquier otra.

Después de desplegar hay que comprobar que la IP que ve la API es la del visitante y no la del proyecto web que reenvía `/api` (amenaza T-27):

1. Haz un login con una contraseña incorrecta desde la aplicación.
2. En el proyecto de la API de Vercel, «Logs», busca `"kind":"security"`: la línea de `login_failed` lleva `ip`.
3. Compárala con tu IP pública. Si coincide, no hay nada que hacer.
4. Si es una IP de Vercel y se repite con otro dispositivo u otra red, todos los visitantes comparten IP y los límites por IP bloquearían a todos a la vez. En ese caso sube `AUTH_LOGIN_LIMIT_PER_IP` y `AUTH_REGISTER_LIMIT_PER_IP` (por ejemplo, a 1000) y vuelve a desplegar: el límite por email sigue protegiendo cada cuenta.

Si alguien queda bloqueado en una demostración, el bloqueo dura 15 minutos en el login y una hora en el registro. Para liberarlo antes, en el editor SQL de Supabase: `delete from auth_attempts;`.

## Límites del plan gratuito que afectan a la entrega

- **Supabase pausa el proyecto tras una semana sin actividad**, y reactivarlo es manual, desde su panel. Si entre la entrega y la evaluación pasan más de siete días sin visitas, la aplicación aparecerá con «Base de datos no disponible». Para evitarlo, el workflow `keepalive.yml` visita `/api/v1/health` cada tres días; usa la variable `PRODUCTION_URL` del entorno `production`. Si aun así se pausa, se reactiva desde el panel de Supabase.
- **Supabase no hace copias de seguridad en el plan gratuito.**
- **El plan Hobby de Vercel es solo para uso no comercial** y corta cada petición a los 300 segundos. Una generación tarda 45 como mucho.
- **La API se suspende entre peticiones.** La primera tras un rato sin uso tarda algo más; el frontend reintenta solo durante unos segundos antes de mostrar un error.

## Comprobado en producción

- `docker compose up --build` arranca la base de datos, aplica las migraciones, carga los datos de demostración y levanta la API y la web (15 de octubre de 2026).
- El despliegue real en Vercel: el reenvío de `/api` entre los dos proyectos con la cookie de refresh, y las migraciones y la comprobación de `/health` desde `deploy.yml`.
- La IP de los eventos de seguridad es la del visitante a través del reenvío (amenaza T-27), comprobada con un login fallido el 16 de octubre de 2026.

## Pendiente de comprobar

- La migración inicial se escribió a mano siguiendo el formato de Prisma y se aplica bien en Supabase. Falta confirmar que `npm run db:migrate` responde que no hay cambios; si crea una migración nueva, hay una diferencia entre la migración y `schema.prisma` y esa migración nueva la corrige.
- El primer evento real en Sentry y sus alertas, cuando estén los DSN.
- Verificar el certificado de Supabase con `sslmode=verify-full` y su certificado raíz: queda como mejora (ver «Riesgos aceptados» en [threat-model.md](threat-model.md)).

## Fuentes

Consultadas el 10 y el 11 de octubre de 2026:

- [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma)
- [Supabase: Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api)
- [Supabase: IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)
- [Supabase: Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits)
- [Supabase pricing](https://supabase.com/pricing)
- [Vercel: Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Vercel: Functions Limits](https://vercel.com/docs/functions/limitations)
- [Vercel: Configuring regions](https://vercel.com/docs/functions/configuring-functions/region)
- [Vercel: Rewrites](https://vercel.com/docs/rewrites)
- [GitHub: Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
