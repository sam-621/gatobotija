# Playback controls — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Use-cases

Todos reciben `{ guildId, voiceChannelId }`, el `QueueRegistry` y los services que usan. Validación común, en este orden: sin canal → `NotInVoiceChannelError`; canal distinto al de la cola → `NotInBotVoiceChannelError` (`NOT_IN_BOT_VOICE_CHANNEL`, error propio de los controles; `DifferentVoiceChannelError` sigue siendo el de `/play`).

- `TrackSkipper`: sin `current` → `QueueEmptyError`. Avanza con la misma lógica que `QueueAdvancer` de `play` (reusar, no duplicar: si hace falta, `TrackSkipper` llama a `QueueAdvancer`). Devuelve el siguiente `Track` o `null`.
- `PlaybackPauser`: sin `current` → `QueueEmptyError`; ya en pausa → `AlreadyPausedError`. `voice.pause` y `status = Paused`.
- `PlaybackResumer`: no está en pausa → `NotPausedError`. `voice.resume` y `status = Playing`.
- `PlaybackStopper`: sin `current` → `QueueEmptyError`. `clear`, `voice.stop`, `voice.leave`, cancela el timer de inactividad y `queues.delete(guildId)`.

Errores nuevos en `music-errors.ts`: `QUEUE_EMPTY`, `ALREADY_PAUSED`, `NOT_PAUSED` y el de canal distinto de los controles.

## Impacto en código existente

- `TrackSkipper` llama a `QueueAdvancer`; si no hay siguiente, `voice.stop` y la salida por inactividad queda a cargo de `QueueAdvancer`.
- El timer de inactividad ya vive en `GuildQueue` (`cancelIdleTimeout`), que gana `pause()` y `resume()` para fijar `status`.
- `VoicePlayer` gana `pause`, `resume` y `stop`.
