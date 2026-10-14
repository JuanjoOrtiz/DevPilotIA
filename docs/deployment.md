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

   Opcionales: `GEMINI_MODEL` (por defecto, `gemini-3.5-flash-lite`: una versión fija y no un alias como `gemini-flash-latest`, que Google cambia sin aviso y que en octubre de 2026 respondía 503 por saturación; los modelos 2.5 ya no existen), `GENERATION_DAILY_LIMIT_PER_USER` (20) y `GENERATION_DAILY_LIMIT_GLOBAL` (200). Ajusta el tope global a la cuota diaria gratuita del modelo elegido, que se consulta en Google AI Studio: una generación con preguntas hace dos llamadas, y cada reintento, una más.

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

2. En Vercel, importa otra vez el mismo repositorio como un proyecto nuevo, por ejemplo `devpilot-web`, y fija «Root Directory» en `apps/web`. El framework es Vite, con sus valores por defecto. No necesita variables de entorno.
3. Como en la API, en «Settings» y «Git» cambia «Production Branch» a `main`.
4. Abre la URL del proyecto: debe aparecer el inicio de sesión. Crea una cuenta, crea un proyecto y genera una especificación.

A partir de aquí, Vercel despliega los dos proyectos con cada cambio en `main` y crea una vista previa de cada pull request y de la rama `develop`. La vista previa del frontend habla con la API de producción; la de la API no tiene base de datos.

## 4. Proteger `main` y `develop`

El repositorio tiene dos ramas permanentes: `develop`, donde se integra el trabajo, y `main`, que es lo que está desplegado.

En GitHub, en «Settings», «Rules» y «Rulesets», crea un «branch ruleset» activo, sin nadie en la lista de excepciones. En «Target branches» incluye la rama por defecto y, con «Include by pattern», `develop`:

- Impedir el borrado y el push forzado, que vienen marcados por defecto. Así `develop` no se borra al fusionarla en `main`.
- Exigir pull request antes de fusionar, con cero aprobaciones obligatorias: con una sola persona no habría quien aprobase.
- Exigir que pasen las comprobaciones «Lint, tipos, tests y build» e «Imagen Docker de la API». Se buscan con ese nombre, sin el prefijo «CI /».

Si se renombra un job de `ci.yml`, hay que actualizar la regla.

El pull request de `develop` a `main` se fusiona siempre con «Create a merge commit». Con «Squash and merge» las dos ramas dejan de compartir historia y el siguiente pull request muestra conflictos y commits repetidos.

## Cambios en la base de datos

Mientras no exista `deploy.yml`, las migraciones se aplican a mano y **antes** de pasar a `main` el código que las necesita:

```bash
npm run db:migrate                                    # en local: crea la migración y la aplica
DATABASE_URL='cadena-de-supabase' npm run db:deploy   # en producción
```

Cada migración debe ser compatible con la versión de la API que está desplegada.

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

## Límites del plan gratuito que afectan a la entrega

- **Supabase pausa el proyecto tras una semana sin actividad**, y reactivarlo es manual, desde su panel. Si entre la entrega y la evaluación pasan más de siete días sin visitas, la aplicación aparecerá con «Base de datos no disponible». Conviene entrar al menos una vez por semana o programar una visita automática a `/api/v1/health`.
- **Supabase no hace copias de seguridad en el plan gratuito.**
- **El plan Hobby de Vercel es solo para uso no comercial** y corta cada petición a los 300 segundos. Una generación tarda 45 como mucho.
- **La API se suspende entre peticiones.** La primera tras un rato sin uso tarda algo más; el frontend reintenta solo durante unos segundos antes de mostrar un error.

## Pendiente de comprobar

- `docker compose up --build`: los Dockerfiles se han probado paso a paso fuera de Docker y el CI construye la imagen de la API, pero el arranque conjunto no se ha ejecutado.
- La migración inicial se escribió a mano siguiendo el formato de Prisma y se aplica bien en Supabase. Falta confirmar que `npm run db:migrate` responde que no hay cambios; si crea una migración nueva, hay una diferencia entre la migración y `schema.prisma` y esa migración nueva la corrige.
- Los dos proyectos se han compilado en local con `vercel build`, y la función resultante responde contra un PostgreSQL local. Falta el despliegue real: la región, el reenvío de `/api` entre los dos proyectos y el cierre de conexiones sin uso.
- Qué cabecera lleva a la API la IP del visitante a través del reenvío (amenaza T-27), antes de implantar el límite de intentos.
- Verificar el certificado de Supabase con `sslmode=verify-full` y su certificado raíz, previsto para el día 18.

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
