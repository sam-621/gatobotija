<!--- cSpell:disable --->

# Testing

Tests de Playwright que recorren flujos completos en el navegador contra el entorno aislado. Prueban lo que la API y los tests unitarios de cada app no ven: que las piezas funcionen juntas como las usa una persona.

## Config

- `playwright.config.ts`: `testDir: './tests'`, `outputDir: './.tmp/test-results'`, `globalSetup: './tests/global-setup.ts'`, `workers: 1`, `reporter: 'list'`, `baseURL` de `lib.mjs`, `locale: 'en-US'`, headless, `screenshot: 'only-on-failure'` y `trace: 'retain-on-failure'`.
- `tests/global-setup.ts` falla con un mensaje claro si el entorno no está arriba (`is<App>Ready` e `isPostgresRunning` de `lib.mjs`).
- Proyecto `setup` con `tests/auth.setup.ts`, que entra por el login de la UI una sola vez y guarda la sesión en `.tmp/auth/<app>.json`. Los specs dependen de él y la reutilizan con `storageState`. Si la app no tiene login, no hay proyecto `setup`.

## Ubicación y nombres

- Un archivo por flujo: `tests/<flujo>.spec.ts`, nombrado por lo que hace la persona (`create-product.spec.ts`).
- Constantes compartidas (usuario, ids del seed, ruta de la sesión) en `tests/constants.ts`, tomadas de `docs/environment.md` > Seed.
- Localizadores y acciones que usan varios specs en `tests/helpers.ts`.
- Cada `test(...)` describe lo que pasa con el verbo real de la acción (`marks a pending payment as paid`, `keeps the payment pending when the dialog is canceled`).

## Reglas

- `test.beforeEach(() => seed())`, con `seed` de `scripts/lib.mjs`: cada test arranca de la DB recién sembrada, así varios specs pueden usar los mismos datos.
- Navegación como un humano: `page.goto`, clics y formularios. Nada de llamar a la API ni de SQL para avanzar en el flujo.
- Selectores por rol y texto visible (`getByRole('button', { name: 'Save' })`), nunca por clases ni por ids de CSS.
- Un happy path por flujo y un test por cada estado de error o cancelación visible en `spec/ui.md`.
- Después de cada acción se verifica lo que ve el usuario: datos, estados, mensajes, y que la pantalla se actualice sin recargar. El happy path cierra recargando y verificando que el cambio sigue ahí.
- Para comprobar que algo **no** se mandó (cancelar un diálogo), se escuchan las peticiones con un helper (`trackMutation(page, '<Operation>')`) y se espera que queden en cero.
- El valor esperado va escrito tal cual en el `expect`, igual que en los tests de la API.
- Los specs no levantan ni bajan el entorno.
