# e2e

Entorno aislado que levanta las apps sobre una DB desechable y con puertos propios. No es una app: no se despliega y solo levanta y prueba las demás. Corre al lado del desarrollo local sin pisarlo.

## Antes de escribir código o usar el entorno

| Si vas a... | Lee |
|-------------|-----|
| Tocar los scripts del entorno, sus puertos o el seed | `docs/environment.md` |
| Escribir o correr tests de Playwright | `docs/testing.md` |

## Reglas que aplican siempre

- Nunca tocar la DB local ni ningún `.env` de desarrollo.
- Puertos propios: admin 3010, API 4010, Postgres 6501. No usar los de desarrollo: 3000, 4000 ni 5432.
- Solo se detienen los procesos que levantó el entorno, los que están en `.tmp/pids.json`.
- `e2e/` levanta las apps desde afuera: no se cambia su código para que un test pase.
- Sin dependencias para el entorno: los scripts usan solo Node y Docker. Playwright es solo para los tests.
- Al terminar de usar el entorno, dejarlo abajo con `yarn env:down`.
- Sin comentarios en el código.
- Código en inglés, incluidos logs, mensajes de error y valores del seed. Solo los nombres propios se quedan como son.

## Dónde vive cada cosa

| Qué | Dónde |
|-----|-------|
| Scripts del entorno | `e2e/scripts/` |
| Tests de Playwright | `e2e/tests/`, config en `e2e/playwright.config.ts` |
| Postgres | `e2e/docker-compose.yml`, proyecto `<proyecto>-e2e` |
| Logs y pids | `e2e/.tmp/`, ignorado en git |
| Screenshots del QA | `e2e/.tmp/qa/` |
| Resultados de los tests y sesión de login | `e2e/.tmp/test-results/`, `e2e/.tmp/auth/` |
| Variables de la API | `apps/api/.env.e2e`, versionado y con valores dummy |
| Seed y sus fixtures | `apps/api/tests/e2e-env/`, siguen las reglas de fixtures de `apps/api/docs/testing.md` |
