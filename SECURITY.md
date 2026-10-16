# Política de seguridad

DevPilot AI es un trabajo de fin de máster que mantiene una sola persona. Los avisos de seguridad son bienvenidos y se atienden.

## Versiones con soporte

Solo tiene soporte la versión desplegada desde `main`. Las correcciones no se llevan a versiones anteriores.

## Informar de una vulnerabilidad

**No abras un issue público.** Usa el aviso privado de GitHub: en el repositorio, **Security → Report a vulnerability**.

Describe qué has encontrado, cómo reproducirlo y qué podría hacer un atacante con ello. Tendrás respuesta en 7 días. Una vez desplegada la corrección, el aviso se puede publicar con tu nombre si quieres.

Quedan fuera del alcance la denegación de servicio por volumen, los hallazgos que necesitan un dispositivo o una cuenta ya comprometidos y la seguridad de los propios proveedores (Vercel, Supabase, Google, Sentry y GitHub).

## Cómo trata el proyecto la seguridad

- Modelo de amenazas, mitigaciones y requisitos de seguridad (SEG-01 a SEG-19), cada uno con su test: [`docs/threat-model.md`](docs/threat-model.md) y [`docs/requirements.md`](docs/requirements.md).
- Dependencias: `npm audit` hace fallar el CI si hay vulnerabilidades altas o críticas, y Dependabot propone actualizaciones cada semana. Las GitHub Actions van fijadas a un commit.
- Los secretos viven solo en las variables de entorno del servidor y en los secretos de GitHub Actions, nunca en el repositorio.
