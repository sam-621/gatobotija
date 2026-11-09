# Play — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Estado

- `Track`: `{ title, url, durationSeconds, requestedBy }` en `src/shared/types/track.ts`. `requestedBy` es el display name de quien lo pidió.
- `GuildQueue` (`src/state/guild-queue/`): `current`, `upcoming`, `voiceChannelId`, `status` (`PlaybackStatus`), `add(track)` devuelve la posición, `next()` mueve el primero de `upcoming` a `current` (o deja `current` en `null`), `clear()`.
- `GuildQueue` también guarda el timer de inactividad: `startIdleTimeout(cb, ms)` / `cancelIdleTimeout()`; `add()` y `clear()` lo cancelan.
- `QueueRegistry` (`src/state/queue-registry/`): `get(guildId)` (crea si no existe), `find(guildId)` (o `null`, sin crear), `delete(guildId)`, `guildIds()`.

## Services

- `AudioSource.resolve(url)`: `yt-dlp --dump-single-json --no-playlist <url>`; mapea `title` y `duration` a un `ResolvedTrack` (`Track` sin `requestedBy`; lo agrega el use-case). Video inexistente o no disponible → `null`; cualquier otro fallo → `AudioResolveFailedError`.
- `AudioSource.stream(track)`: `yt-dlp -f bestaudio --no-playlist -o - <url>`, su stdout pasa por `ffmpeg` a Ogg/Opus y se reproduce con `StreamType.OggOpus` (sin librería de opus). Fallo del proceso → `AudioStreamFailedError`; los errores tardíos del stream se loguean y nunca quedan sin listener.
- `VoicePlayer`: un `VoiceConnection` + `AudioPlayer` por `guildId` dentro de `DiscordVoicePlayer`. `onIdle(guildId, cb)` se dispara cuando el `AudioPlayer` pasa a `Idle`. `onDisconnect(guildId, cb)` se dispara si la conexión pasa a `Disconnected` y no vuelve en 5 s, o a `Destroyed` desde afuera (un `leave` propio no lo dispara). `onChannelChange(guildId, cb)` se dispara si mueven al bot a otro canal (lo detecta con `voiceStateUpdate` del client); el use-case actualiza `queue.voiceChannelId`. Sin `pause`/`resume`/`stop` todavía (`playback-controls`). `play` sin conexión → `VoiceNotConnectedError`. El adapter necesita el client: `createAppContext(config, client)`.

## Use-cases

- Todos los use-cases reciben el `appContext` por constructor.
- `TrackEnqueuer` (`modules/music/use-cases/track-enqueuer/`, con su test): input `{ guildId, voiceChannelId, url, requestedBy }`. Orden: sin canal → `NotInVoiceChannelError`; `parseYoutubeUrl` nulo → `InvalidYoutubeUrlError`; bot en otro canal con algo sonando → `DifferentVoiceChannelError` (se revisa antes y después del `resolve`); `resolve` nulo → `TrackNotFoundError`. Si no hay `current`: `join`, `play`, registra `onIdle` (→ `QueueAdvancer`), `onDisconnect` (→ `QueueReleaser`) y `onChannelChange`. Devuelve `{ track, position }` (`position` 0 = suena ya). Si la cola se liberó mientras se abría el stream, lo destruye y lanza `QueueReleasedError` (error genérico). Si falla el stream del primer track, corre `QueueAdvancer` (si la cola sigue siendo la misma) y relanza; si falla el `join`, sale, borra la cola (si sigue siendo la misma) y relanza.
- `QueueAdvancer` (`modules/music/use-cases/queue-advancer/`): lo llama el `onIdle`. Avanza la cola y reproduce el siguiente; si `stream` o `play` lanzan, destruye el stream, loguea y sigue con el próximo; si no queda nada, arranca el timer de 5 minutos (`IDLE_TIMEOUT_MS`) que corre `QueueReleaser`. Un `add` posterior cancela el timer. Si la cola cambió de identidad durante el `await` (se liberó y se creó otra), no toca nada. Unit con fake timers.
- `QueueReleaser` (`modules/music/use-cases/queue-releaser/`): `voice.leave` + `queues.delete`. Lo usan el `onDisconnect` y el shutdown de `index.ts`.
- Errores nuevos en `music-errors.ts`: `NOT_IN_VOICE_CHANNEL`, `INVALID_YOUTUBE_URL`, `DIFFERENT_VOICE_CHANNEL`, `TRACK_NOT_FOUND`.

## Impacto en código existente

- `createAppContext(config, client)` agrega `queues`, `services.audio` y `services.voice`. `client.ts` se parte en `createClient()` + `registerEvents(client, appContext)`; `deploy-commands` arma un client sin login.
- `createTestAppContext` agrega `QueueRegistry` real, `DummyVoicePlayer` y un `AudioSource` falso.
- `index.ts`: en el shutdown, `QueueReleaser` por cada servidor de `queues.guildIds()`.
