# Playback controls — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Use-cases

Todos reciben `{ guildId, voiceChannelId }`, el `QueueRegistry` y los services que usan. Validación común, en este orden: sin canal → `NotInVoiceChannelError`; canal distinto al de la cola → `DifferentVoiceChannelError`.

- `TrackSkipper`: sin `current` → `QueueEmptyError`. Avanza con la misma lógica que `QueueAdvancer` de `play` (reusar, no duplicar: si hace falta, `TrackSkipper` llama a `QueueAdvancer`). Devuelve el siguiente `Track` o `null`.
- `PlaybackPauser`: sin `current` → `QueueEmptyError`; ya en pausa → `AlreadyPausedError`. `voice.pause` y `status = Paused`.
- `PlaybackResumer`: no está en pausa → `NotPausedError`. `voice.resume` y `status = Playing`.
- `PlaybackStopper`: sin `current` → `QueueEmptyError`. `clear`, `voice.stop`, `voice.leave`, cancela el timer de inactividad y `queues.delete(guildId)`.

Errores nuevos en `music-errors.ts`: `QUEUE_EMPTY`, `ALREADY_PAUSED`, `NOT_PAUSED`.

## Impacto en código existente

- Si `TrackSkipper` reusa `QueueAdvancer`, el timer de inactividad tiene que quedar accesible para que `PlaybackStopper` lo cancele (p. ej. guardado en `GuildQueue`).
