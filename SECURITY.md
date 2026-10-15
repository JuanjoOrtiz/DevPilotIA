# Security policy

DevPilot AI is a master's thesis project maintained by one person. Security reports are welcome and taken seriously.

## Supported versions

Only the version deployed from `main` is supported. Fixes are not backported.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private reporting instead: in the repository, go to **Security → Report a vulnerability**.

Include what you found, how to reproduce it and what an attacker could do with it. You will get an answer within 7 days. Once the fix is deployed, the report can be published with credit to you if you wish.

Out of scope: denial of service through volume, findings that need a compromised device or account, and the security of the providers themselves (Vercel, Supabase, Google, Sentry, GitHub).

## How the project handles security

- Threat model, mitigations and the security requirements (SEG-01 to SEG-19), each with its test: [`docs/threat-model.md`](docs/threat-model.md) and [`docs/requirements.md`](docs/requirements.md).
- Dependencies: `npm audit` fails the CI with high or critical vulnerabilities, and Dependabot proposes updates every week. GitHub Actions are pinned to a commit.
- Secrets live only in the server's environment variables and in GitHub Actions secrets, never in the repository.

---

# Política de seguridad

DevPilot AI es un trabajo de fin de máster que mantiene una sola persona. Los avisos de seguridad son bienvenidos y se atienden.

Para informar de una vulnerabilidad, **no abras un issue público**: usa el aviso privado de GitHub, en **Security → Report a vulnerability**. Describe qué has encontrado, cómo reproducirlo y qué podría hacer un atacante. Tendrás respuesta en 7 días y, una vez corregido, se puede publicar con tu nombre si quieres.
