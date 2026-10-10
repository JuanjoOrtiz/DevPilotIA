# Despliegue

La aplicación se despliega en tres servicios gratuitos: la base de datos en Supabase, la API en Render y el frontend en Vercel. Se configuran en ese orden, porque cada uno necesita un dato del anterior.

Estos pasos no se han ejecutado todavía contra las cuentas reales: la primera vez conviene seguirlos con calma y anotar aquí cualquier diferencia.

## 1. Base de datos en Supabase

De Supabase se usa solo su PostgreSQL. La autenticación, el almacenamiento y la API de datos de Supabase no se usan.

1. Crea un proyecto en la región europea más cercana a Fráncfort, que es donde estará la API.
2. **Desactiva la API de datos.** En el panel, abre la integración «Data API» y apaga «Enable Data API». Si queda activa, las tablas del esquema `public` son accesibles por REST con la clave pública del proyecto, sin pasar por DevPilot (amenaza T-25).
3. **Crea un rol propio para la aplicación**, en el editor SQL, con una contraseña larga y aleatoria:

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

4. **Copia la cadena de conexión del pooler en modo sesión** (botón «Connect», puerto 5432) y adáptala:

   ```
   postgresql://prisma.[REF-DEL-PROYECTO]:[CONTRASEÑA]@[HOST-DEL-POOLER]:5432/postgres?sslmode=require&uselibpqcompat=true
   ```

   - El usuario es `prisma.[REF-DEL-PROYECTO]`, no `postgres.[REF-DEL-PROYECTO]`.
   - Si la contraseña tiene símbolos, hay que codificarlos como en una URL.
   - `sslmode=require&uselibpqcompat=true` cifra la conexión sin verificar el certificado del servidor. Sin `uselibpqcompat=true`, el driver intenta verificarlo y falla, porque el certificado de Supabase no está entre los de confianza del sistema.
   - No vale la conexión directa (`db.[REF].supabase.co`): solo funciona por IPv6, y Render y GitHub Actions salen por IPv4.

5. **Aplica las migraciones** desde tu máquina:

   ```bash
   DATABASE_URL='la-cadena-anterior' npm run db:deploy
   ```

Esa cadena es un secreto: va en el panel de Render y en tu terminal, nunca en el repositorio.

## 2. API en Render

1. En Render, elige «New» y «Blueprint», y selecciona el repositorio. Render lee `render.yaml` y propone el servicio `devpilot-api` en el plan gratuito.
2. Cuando pida `DATABASE_URL`, pega la cadena del paso anterior.
3. Espera al primer despliegue y anota la URL del servicio, del tipo `https://devpilot-api-xxxx.onrender.com`.
4. Comprueba que responde:

   ```bash
   curl https://TU-SERVICIO.onrender.com/api/v1/health
   # {"status":"ok","database":"up","version":"<commit>"}
   ```

Si la API no arranca, el registro de Render dice qué variable falta o es inválida. En producción rechaza las credenciales de ejemplo y una `DATABASE_URL` sin `sslmode`.

`render.yaml` pide a Render que despliegue solo cuando el CI de GitHub ha pasado.

## 3. Frontend en Vercel

1. En `apps/web/vercel.json`, sustituye el destino de la primera regla por la URL de Render y súbelo a `main`:

   ```json
   { "source": "/api/:path*", "destination": "https://TU-SERVICIO.onrender.com/api/:path*" }
   ```

2. En Vercel, importa el repositorio y fija «Root Directory» en `apps/web`. El framework es Vite, con sus valores por defecto.
3. Abre la URL de Vercel. La página de inicio debe mostrar «Operativo»; si Render estaba dormido, antes mostrará «Despertando el servidor» durante cerca de un minuto.

A partir de aquí, Vercel y Render despliegan solos con cada cambio en `main`.

## 4. Proteger la rama `main`

En GitHub, en «Settings» y «Branches», añade una regla para `main`:

- Exigir pull request antes de fusionar, sin aprobaciones obligatorias: con una sola persona no habría quien aprobase.
- Exigir que pasen las comprobaciones «Lint, tipos, tests y build» e «Imagen Docker de la API».

Hazlo después de subir el esqueleto, porque esas comprobaciones solo aparecen en la lista cuando el CI se ha ejecutado una vez.

## Cambios en la base de datos

Mientras no exista `deploy.yml`, las migraciones se aplican a mano y **antes** de subir el código que las necesita:

```bash
npm run db:migrate                                # en local: crea la migración y la aplica
DATABASE_URL='cadena-de-supabase' npm run db:deploy   # en producción
```

Cada migración debe ser compatible con la versión de la API que está desplegada.

## Límites del plan gratuito que afectan a la entrega

- **Supabase pausa el proyecto tras una semana sin actividad**, y reactivarlo es manual, desde su panel. Si entre la entrega y la evaluación pasan más de siete días sin visitas, la aplicación aparecerá con «Base de datos no disponible». Conviene entrar al menos una vez por semana o programar una visita automática a `/api/v1/health`.
- **Render duerme la API tras 15 minutos sin tráfico.** La primera visita tarda cerca de un minuto; el frontend lo explica.
- **Supabase no hace copias de seguridad en el plan gratuito.**

## Pendiente de comprobar

- `docker compose up --build`: los Dockerfiles se han probado paso a paso fuera de Docker, pero no se han construido como imágenes.
- La migración inicial se escribió a mano siguiendo el formato de Prisma. `npm run db:migrate` debe responder que no hay cambios; si crea una migración nueva, hay una diferencia entre la migración y `schema.prisma` y esa migración nueva la corrige.
- El reenvío de Vercel mientras Render despierta: confirmar que el frontend muestra «Despertando el servidor» y no un error.
- Verificar el certificado de Supabase con `sslmode=verify-full` y su certificado raíz, previsto para el día 18.

## Fuentes

Consultadas el 10 de octubre de 2026:

- [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma)
- [Supabase: Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api)
- [Supabase: IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)
- [Supabase pricing](https://supabase.com/pricing)
- [Render: Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Vercel: Rewrites](https://vercel.com/docs/rewrites)
