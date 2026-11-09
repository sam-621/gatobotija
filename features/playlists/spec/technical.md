# Playlists — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Links

- `parseYoutubeUrl` pasa a devolver `{ kind: 'video', url } | { kind: 'playlist', url } | null` (`architecture.md` > Links de YouTube). Los casos actuales del test se adaptan al nuevo retorno.
- Playlist: un path `/playlist` en `youtube.com` o `music.youtube.com` con `list=<id>`. Un `list` que empieza con `RD` → `null`. Se normaliza a `https://www.youtube.com/playlist?list=<id>`.
- `watch?v=...&list=...` sigue siendo video.

## Services

- `AudioSource.resolvePlaylist(url, limit)`: `yt-dlp --flat-playlist --dump-single-json --playlist-end <limit + 1> <url>`. Pide uno de más para saber si hay más. El tope de 100 es regla de negocio y lo pasa el use-case (`architecture.md` > Services: sin reglas).
- Devuelve `{ title, tracks: ResolvedTrack[], truncated: boolean }`. Corta las entradas crudas a las primeras `limit` y después filtra, así se respetan "las primeras 100 en orden"; `truncated` = más de `limit` entradas crudas. Saca las entradas sin `id` o sin `title`, o marcadas como no disponibles (`[Private video]`, `[Deleted video]`, `availability` distinto de `public`/`unlisted`/`null`). La `url` de cada track es `https://www.youtube.com/watch?v=<id>`.
- `duration` puede llegar `null` en modo flat; en ese caso `durationSeconds = 0`.
- Playlist inexistente o privada → `null`; cualquier otro fallo → `AudioResolveFailedError`.
- El `AudioSource` falso de los tests suma `resolvePlaylist`.

## Use-case

- Misma validación y en el mismo orden que `TrackEnqueuer`: sin canal, link inválido, otro canal (antes y después del `resolve`). Después, `resolvePlaylist` nulo o sin tracks → `PlaylistNotFoundError` (`PLAYLIST_NOT_FOUND`).
- Agrega todos los tracks a la cola. Si no había `current`, arranca el primero con el mismo camino que `TrackEnqueuer` (`join`, `play`, callbacks): reusar, no duplicar.
- Devuelve `{ title, count, truncated, startedTrack | null, position }`.
- El despacho por `kind` vive en `TrackEnqueuer`: según el link llama a `resolve` o a `resolvePlaylist`, y los dos caminos comparten el mismo método de encolado y arranque. No hay `PlaylistEnqueuer`.
- Para un video devuelve `{ track, position }`, como antes; el comando distingue las dos formas para armar la respuesta.

## Impacto en código existente

- `parseYoutubeUrl` y su test.
- `AudioSource` (interface, `YtDlpAudioSource` y el fake de tests).
- `/play` y sus tests.
- `architecture.md` ya describe los links de playlist y `resolvePlaylist`.
