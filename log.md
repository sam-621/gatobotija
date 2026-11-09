# gatobotija — log del proyecto

## 2026-11-09 — samuel.corrales621

- Se quitan las apps `api` y `admin`, el entorno `e2e/`, sus agentes y `/qa`; el proyecto queda con una sola app.
- (bot) Nueva app `bot`, bot de música para Discord: docs de arquitectura, estilo, testing y comandos, y agentes `bot-implementer` y `bot-reviewer`.
- El template `spec/ui.md` de features describe comandos y respuestas de Discord en vez de pantallas.
- (bot) `/play` solo acepta links de videos de YouTube, sin búsqueda por texto; docs de arquitectura, estilo y testing ajustados.
- [bot-setup] Se crea la feature: esqueleto del bot, registro de comandos y `/ping`.
- [play] Se crea la feature: `/play` con links de YouTube, cola por servidor y salida por inactividad.
- [playback-controls] Se crea la feature: `/skip`, `/pause`, `/resume` y `/stop`.
- [queue-view] Se crea la feature: `/nowplaying` y `/queue`.
