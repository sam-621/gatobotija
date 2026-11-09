# Playlists — log

## 2026-11-09 — samuel.corrales621

**Hecho:**
- Se crea la feature con su spec.
- bot: `parseYoutubeUrl` distingue entre video y playlist (rechaza mixes `RD`).
- bot: `resolvePlaylist(url, limit)` en yt-dlp: corta a las primeras `limit` entradas antes de filtrar las no disponibles y marca `truncated`.
- bot: `/play` encola playlists. El despacho vive en `TrackEnqueuer`, que comparte el arranque con el camino de video, y el tope de 100 vive en el use-case.
- Cambia `technical.md`: `resolvePlaylist` recibe el límite y no hay `PlaylistEnqueuer`.
- Las descripciones del slash command cambiaron: hace falta `yarn commands:deploy`.
- bot: probado en el servidor, las playlists se encolan bien.
- Se cierra la feature.
