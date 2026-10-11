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

   | Supabase la da así | Tiene que quedar así |
   | --- | --- |
   | `postgres.abcdefghijklmnop` | `prisma.abcdefghijklmnop` |
   | `[YOUR-PASSWORD]` | la contraseña del paso 2, sin corchetes |
   | termina en `/postgres` | termina en `/postgres?sslmode=require&uselibpqcompat=true` |

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
3. En «Environment Variables» añade `DATABASE_URL` con la cadena de Supabase y pulsa «Deploy».
4. Cuando termine, entra en «Settings» y «Environment Variables», edita `DATABASE_URL` y déjala solo en el entorno «Production». Así las vistas previas de los pull requests no pueden tocar la base de datos real (amenaza T-28).
5. Anota la URL de producción del proyecto, del tipo `https://devpilot-api.vercel.app`, y comprueba que responde:

   ```bash
   curl https://TU-PROYECTO-API.vercel.app/api/v1/health
   # {"status":"ok","database":"up","version":"<commit>"}
   ```

Si responde con un error 500, abre «Logs» en el proyecto: la API dice qué variable falta o es inválida, nunca su valor. En producción rechaza las credenciales de ejemplo y una `DATABASE_URL` sin `sslmode`.

Si los registros muestran errores de «max clients», el pooler en modo sesión se ha quedado sin conexiones. La salida es usar en Vercel la cadena del «Transaction pooler» (puerto 6543), que Supabase recomienda para funciones, y dejar la del modo sesión para las migraciones. No se ha probado todavía con este proyecto.

## 3. Frontend en Vercel

1. En `apps/web/vercel.json`, sustituye el destino de la primera regla por la URL de la API y súbelo a `main` con un pull request:

   ```json
   { "source": "/api/:path*", "destination": "https://TU-PROYECTO-API.vercel.app/api/:path*" }
   ```

2. En Vercel, importa otra vez el mismo repositorio como un proyecto nuevo, por ejemplo `devpilot-web`, y fija «Root Directory» en `apps/web`. El framework es Vite, con sus valores por defecto. No necesita variables de entorno.
3. Abre la URL del proyecto. La página de inicio debe mostrar «Operativo».

A partir de aquí, Vercel despliega los dos proyectos con cada cambio en `main` y crea una vista previa de cada pull request. La vista previa del frontend habla con la API de producción; la de la API no tiene base de datos.

## 4. Proteger la rama `main`

En GitHub, en «Settings», «Rules» y «Rulesets», crea un «branch ruleset» activo sobre la rama por defecto, sin nadie en la lista de excepciones:

- Exigir pull request antes de fusionar, con cero aprobaciones obligatorias: con una sola persona no habría quien aprobase.
- Exigir que pasen las comprobaciones «Lint, tipos, tests y build» e «Imagen Docker de la API». Se buscan con ese nombre, sin el prefijo «CI /».

Si se renombra un job de `ci.yml`, hay que actualizar la regla.

## Cambios en la base de datos

Mientras no exista `deploy.yml`, las migraciones se aplican a mano y **antes** de fusionar el código que las necesita:

```bash
npm run db:migrate                                    # en local: crea la migración y la aplica
DATABASE_URL='cadena-de-supabase' npm run db:deploy   # en producción
```

Cada migración debe ser compatible con la versión de la API que está desplegada.

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
