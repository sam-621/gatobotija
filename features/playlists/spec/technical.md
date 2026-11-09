# Playlists — especificación técnica

Reglas de negocio y decisiones en `product.md`.

## Links

- `parseYoutubeUrl` pasa a devolver `{ kind: 'video', url } | { kind: 'playlist', url } | null` (`architecture.md` > Links de YouTube). Los casos actuales del test se adaptan al nuevo retorno.
- Playlist: un path `/playlist` en `youtube.com` o `music.youtube.com` con `list=<id>`. Un `list` que empieza con `RD` → `null`. Se normaliza a `https://www.youtube.com/playlist?list=<id>`.
- `watch?v=...&list=...` sigue siendo video.

## Services

- `AudioSource.resolvePlaylist(url)`: `yt-dlp --flat-playlist --dump-single-json --playlist-end 101 <url>`. Pide uno de más para saber si hay más de 100.
- Devuelve `{ title, tracks: ResolvedTrack[], truncated: boolean }`, con como máximo 100 tracks. Saca las entradas sin `id` o marcadas como no disponibles (`[Private video]`, `[Deleted video]`, `availability` distinto de `public`/`unlisted`/`null`). La `url` de cada track es `https://www.youtube.com/watch?v=<id>`.
- `duration` puede llegar `null` en modo flat; en ese caso `durationSeconds = 0`.
- Playlist inexistente o privada → `null`; cualquier otro fallo → `AudioResolveFailedError`.
- El `AudioSource` falso de los tests suma `resolvePlaylist`.

## Use-case

- Misma validación y en el mismo orden que `TrackEnqueuer`: sin canal, link inválido, otro canal (antes y después del `resolve`). Después, `resolvePlaylist` nulo o sin tracks → `PlaylistNotFoundError` (`PLAYLIST_NOT_FOUND`).
- Agrega todos los tracks a la cola. Si no había `current`, arranca el primero con el mismo camino que `TrackEnqueuer` (`join`, `play`, callbacks): reusar, no duplicar.
- Devuelve `{ title, count, truncated, startedTrack | null, position }`.
- El comando `/play` elige el use-case según el `kind` del link, o un use-case recibe el link y delega. Un comando llama a un solo use-case (`architecture.md`), así que lo más probable es que el despacho viva en un use-case.

## Impacto en código existente

- `parseYoutubeUrl` y su test.
- `AudioSource` (interface, `YtDlpAudioSource` y el fake de tests).
- `/play` y sus tests.
- `architecture.md` ya describe los links de playlist y `resolvePlaylist`.
