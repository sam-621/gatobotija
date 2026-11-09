---
status: done
apps: [bot]
created: 2026-11-09
---

# Bot setup

## Contexto

El repo tiene solo los docs de `apps/bot`. Hace falta el esqueleto para que el bot se conecte al servidor, registre slash commands y responda, antes de meter música.

## Historia de usuario

Como dueño del servidor, quiero invitar al bot y que responda a un comando, para saber que está conectado y listo para las siguientes features.

## Flujo

1. El usuario crea la aplicación en el Developer Portal, invita el bot al servidor y llena el `.env`.
2. Corre `yarn commands:deploy`: los comandos aparecen en el servidor.
3. Corre `yarn dev`: el bot queda en línea y loguea que está listo.
4. Alguien escribe `/ping` y el bot responde.

## Reglas de negocio

- Si falta una variable de entorno o tiene mal formato, el bot no arranca y el error dice cuál.
- Un comando que lanza un error inesperado responde un mensaje genérico efímero y el error queda en el log; el bot sigue arriba.
- Los comandos solo funcionan dentro del servidor: en DM no se registran.

## Decisiones

- **Comandos registrados por servidor (`DISCORD_GUILD_ID`), no globales**: aparecen al instante y el bot es para un solo servidor.
- **`/ping` como comando de prueba**: valida el cableado de punta a punta sin depender de voz ni de YouTube.

## Fuera de alcance

- Música, voz y colas (features `play`, `playback-controls`, `queue-view`).
- Dockerfile y despliegue.
- Soporte para varios servidores con comandos globales.

## Plan de trabajo recomendado

1. [x] bot: proyecto base: `package.json` con los scripts de `docs/commands.md`, TypeScript, ESLint + Prettier, Vitest y aliases.
2. [x] bot: config con zod, logger, `AppError`/`BusinessError`/`InvalidInputError`, `UseCase` y app context.
3. [x] bot: client, `ready`, `interaction-create`, `Command`, `reply`, `deploy-commands` e `index.ts` con shutdown.
4. [x] bot: `/ping` con su test y utilidades de test (`createInteraction`, `createTestAppContext`).
5. [ ] bot: prueba manual en el servidor (la corre el usuario).
