# Bot setup — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Piezas

Todo según `apps/bot/docs/architecture.md`:

- `src/config/`: `NODE_ENV`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, sin defaults. `.env.example` con las cuatro.
- `src/context/app-context.ts`: `createAppContext(config)` con `services.logger`. `queues`, `audio` y `voice` los agrega la feature `play`.
- `src/shared/`: `errors/app-error.ts`, `errors/business-error.ts`, `errors/invalid-input-error.ts`, `use-case.ts`.
- `src/commands/command.ts`, `src/commands/utils/reply.ts`, `src/commands/index.ts`, `src/commands/ping-command.ts`.
- `src/events/ready.ts`, `src/events/interaction-create.ts`.
- `src/client.ts`: intents mínimos (`Guilds`, `GuildVoiceStates`).
- `src/deploy-commands.ts`: `REST.put(Routes.applicationGuildCommands(clientId, guildId), { body })`.
- `src/index.ts`: carga config, arma el app context, login y shutdown en `SIGINT`/`SIGTERM`.

## Tests

- `src/config/config.test.ts`: mapea bien y falla con una variable faltante.
- `src/events/interaction-create.test.ts`: comando desconocido y comando que lanza.
- `tests/commands/ping/ping-command.test.ts`.
- `tests/utils/interaction.ts` y `tests/utils/app-context.ts`, que reusan las features siguientes.
