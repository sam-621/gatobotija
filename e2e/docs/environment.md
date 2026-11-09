<!--- cSpell:disable --->

# Entorno

## Servicios

| Servicio | URL |
|----------|-----|
| Admin | `http://localhost:3010` |
| API | `http://localhost:4010` |
| Postgres | `postgresql://postgres:test@localhost:6501/<proyecto>_e2e` |

Solo se levantan las apps que existen en `apps/`.

## Requisitos

- Docker corriendo.
- Node 22.10 o más nuevo.
- `node_modules` instalados en cada app que levanta el entorno.
- Solo para los tests: `yarn install` y `yarn playwright install chromium` dentro de `e2e/`.

## Comandos

Se corren dentro de `e2e/`. Esta tabla es el contrato de los scripts del `package.json`: si falta uno, se agrega con este nombre. Los `env:*` no necesitan `yarn install`.

| Comando | Para qué |
|---------|----------|
| `yarn env:up` | Levanta Postgres, migra, crea los roles que pida la API, siembra y levanta las apps en segundo plano. Falla si un puerto está ocupado. |
| `yarn env:reset` | Deja la DB como recién sembrada sin reiniciar las apps. |
| `yarn env:down` | Detiene los procesos del entorno y baja Postgres borrando su volumen. |
| `yarn test` | Corre los tests de Playwright headless con Chromium. Necesita el entorno arriba; no lo levanta ni lo baja. |
| `yarn test:e2e` | Corre `env:up`, los tests y `env:down` en un solo comando, y sale con el código de los tests. Los argumentos van a Playwright (`yarn test:e2e tests/<flujo>.spec.ts`, `yarn test:e2e --headed`). Si `env:up` falla (p. ej. porque el entorno ya está arriba), no corre los tests y lo deja como está: en ese caso se usa `yarn test`. |

El agente puede correr todos: el entorno no toca ninguna DB real.

## Scripts

```
e2e/scripts/
├── lib.mjs          puertos, URLs y las funciones del entorno (exportadas para los tests)
├── env-up.mjs
├── env-reset.mjs
├── env-down.mjs
└── test-e2e.mjs
```

- `lib.mjs` exporta `PORTS`, las URLs de cada app y las funciones `startPostgres`, `migrate`, `seed`, `start<App>`, `waitFor<App>`, `is<App>Ready`, `isPostgresRunning`, `ensurePortsAreFree` y `stopEnvironment`. Los demás scripts solo las llaman en orden.
- `env:up` revisa primero que los puertos estén libres; si algo falla después, baja lo que haya levantado antes de salir con error.
- Cada app se levanta con `spawn` desacoplado (`detached: true`), con su salida a `.tmp/<app>.log` y su pid en `.tmp/pids.json` junto a un marcador único de su comando (p. ej. `--<proyecto>-e2e` o `--port 3010`).
- `stopEnvironment` lee `.tmp/pids.json` al revés y, antes de matar un pid, confirma con `ps` que su comando todavía tiene el marcador; si no, avisa y no lo toca. Manda `SIGTERM` al grupo, espera y, si sigue vivo, `SIGKILL`. Al final, `docker compose down -v --remove-orphans`.
- Una app está lista cuando responde: la API a una query mínima (`{ __typename }`) y el admin a un `GET` de su URL. Si el proceso muere durante el arranque o no responde a tiempo, el error incluye las últimas líneas de su log.
- La API corre con las variables de `apps/api/.env.e2e` y `NODE_ENV=e2e`. El admin recibe la URL de la API del entorno en `VITE_API_URL`.
- Postgres en `docker-compose.yml`, publicado solo en `127.0.0.1`, con volumen nombrado y healthcheck; se levanta con `docker compose up -d --wait`.

## Seed

- Vive en `apps/api/tests/e2e-env/` (`seed.ts` y sus fixtures) y deja la DB en un estado fijo: borra todo y vuelve a cargar.
- Ids fijos y reconocibles, en los `*Constants` de cada fixture (p. ej. `e2e00001-0000-4000-8000-000000000001`).
- Este archivo lista lo que trae el seed para que los tests y el QA lo usen sin leer las fixtures: usuarios y contraseñas, y los datos de cada escenario con su id. Se actualiza en el mismo cambio que el seed.

| Dato | Valor |
|------|-------|
| Usuario | `admin@<proyecto>.test` / `<contraseña>` |
