# Queue view — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Piezas

- `formatDuration(seconds)` en `src/shared/utils/format-duration.ts`: `213` → `3:33`, `3725` → `1:02:05`. Si `play` ya la creó, se reusa.
- `NowPlayingCommand` y `QueueCommand`: sin use-case; leen `appContext.queues.get(guildId)` y responden. Fuera de un servidor, el mensaje genérico.
- `QueueCommand` tiene `MAX_LISTED = 10` como constante del archivo del comando.

## Tests

- `tests/commands/nowplaying/` y `tests/commands/queue/`: cola vacía, con un track, con más de 10 en `/queue`. El estado se arma con el `QueueRegistry` del app context y los tracks de `tests/fixtures/track.fixtures.ts`.
