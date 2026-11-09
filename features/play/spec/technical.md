# Play — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Estado

- `Track`: `{ title, url, durationSeconds, requestedBy }` en `src/shared/types/track.ts`. `requestedBy` es el display name de quien lo pidió.
- `GuildQueue` (`src/state/guild-queue/`): `current`, `upcoming`, `voiceChannelId`, `status` (`PlaybackStatus`), `add(track)` devuelve la posición, `next()` mueve el primero de `upcoming` a `current` (o deja `current` en `null`), `clear()`.
- `QueueRegistry` (`src/state/queue-registry/`): `get(guildId)`, `delete(guildId)`.

## Services

- `AudioSource.resolve(url)`: `yt-dlp --dump-single-json --no-playlist <url>`; mapea `title` y `duration`. Video inexistente o no disponible → `null`; cualquier otro fallo → `AudioResolveFailedError`.
- `AudioSource.stream(track)`: `yt-dlp -f bestaudio -o - <url>` y su stdout pasa por `ffmpeg` (o directo a `createAudioResource` con `StreamType.Arbitrary`).
- `VoicePlayer`: un `VoiceConnection` + `AudioPlayer` por `guildId` dentro de `DiscordVoicePlayer`. `onIdle(guildId, cb)` se dispara cuando el `AudioPlayer` pasa a `Idle`. El adapter necesita el `voiceAdapterCreator` del guild: lo recibe del client al construirse en `createAppContext`.

## Use-cases

- `TrackEnqueuer` (`modules/music/use-cases/track-enqueuer/`): input `{ guildId, voiceChannelId, url, requestedBy }`. Orden: sin canal → `NotInVoiceChannelError`; `parseYoutubeUrl` nulo → `InvalidYoutubeUrlError`; bot en otro canal → `DifferentVoiceChannelError`; `resolve` nulo → `TrackNotFoundError`. Si no hay `current`: `join`, `play`, registra `onIdle`. Devuelve `{ track, position }` (`position` 0 = suena ya).
- `QueueAdvancer` (`modules/music/use-cases/queue-advancer/`): lo llama el `onIdle`. Avanza la cola y reproduce el siguiente; si `stream` lanza, loguea y sigue con el próximo; si no queda nada, arranca el timer de 5 minutos (`IDLE_TIMEOUT_MS`) que hace `leave` y `delete` de la cola. Un `add` posterior cancela el timer. Unit con fake timers.
- Errores nuevos en `music-errors.ts`: `NOT_IN_VOICE_CHANNEL`, `INVALID_YOUTUBE_URL`, `DIFFERENT_VOICE_CHANNEL`, `TRACK_NOT_FOUND`.

## Impacto en código existente

- `createAppContext` agrega `queues`, `services.audio` y `services.voice`.
- `createTestAppContext` agrega `QueueRegistry` real, `DummyVoicePlayer` y un `AudioSource` falso.
- `index.ts`: en el shutdown, `voice.leave` de cada servidor.
