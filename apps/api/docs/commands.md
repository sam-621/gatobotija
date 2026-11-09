<!--- cSpell:disable --->

# Comandos

Todos se corren dentro de `apps/api`. Esta tabla es el contrato de los scripts del `package.json`: si falta uno, se agrega con este nombre.

## Los puede correr el agente

| Comando | Para qué |
|---------|----------|
| `yarn test [ruta]` | Tests unitarios (`*.test.ts`). Sin Docker. |
| `yarn test:int [ruta]` | Tests de integración (`*.int.test.ts`). Levanta Postgres en Docker, migra, corre y lo baja. |
| `yarn test:e2e [ruta]` | Tests e2e (`*.e2e.test.ts`). Levanta Postgres en Docker, migra, corre y lo baja. |
| `yarn lint:check` | Revisa ESLint + Prettier. |
| `yarn lint:fix` | Arregla lint, formato y orden de imports. |
| `yarn gen:types` | Regenera los tipos de GraphQL a partir de los `.gql`. Correr cuando cambia un `.gql`. |
| `yarn migrate:make <nombre>` | Crea el archivo de una migración nueva. No toca ninguna DB. |
| `yarn build` | Typecheck y build de producción. |

- No correr `tsc --noEmit` para verificar ediciones; el diagnóstico del IDE basta. El typecheck real es `yarn build`.
- Tests: solo los de la feature, nunca la suite completa (ver `testing.md`). Nunca `yarn test:int` y `yarn test:e2e` en paralelo.
- `yarn env:up`, `yarn env:reset` y `yarn env:down`, dentro de `e2e/`: entorno aislado con su propio Postgres y sus propios puertos (ver `e2e/CLAUDE.md`).

## Solo los corre el usuario

Todo lo que toca una DB real, levanta el server o pega a una API viva, salvo el entorno de `e2e/`. Si hace falta, se le pide y se espera.

| Comando | Para qué |
|---------|----------|
| `yarn dev` | Levanta la app en local. |
| `yarn start` | Corre la build. |
| `yarn migrate <config>` | Aplica las migraciones pendientes. `<config>` es el archivo env con la conexión de migraciones (p. ej. `.env.migration`). |
| `yarn seed` | Siembra datos base. |

## Variables de entorno

Todas son obligatorias y ninguna tiene default (ver `architecture.md` > Config). Se documenta aquí cada una que se agregue, con su `.env.example`.

| Variable | Para qué |
|----------|----------|
| `NODE_ENV` | `development`, `test` o `production`. |
| `PORT` | Puerto del server. |
| `DATABASE_URL` | Conexión de la app. |
