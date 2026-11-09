# Play — log

## 2026-11-09 — samuel.corrales621

**Hecho:**
- Se crea la feature con su spec.
- (bot) Pasos 1 a 6: `GuildQueue`/`QueueRegistry`, `parseYoutubeUrl`, services `audio` (yt-dlp + ffmpeg a Ogg/Opus) y `voice` (`@discordjs/voice`), use-cases `TrackEnqueuer`, `QueueAdvancer` y `QueueReleaser`, y `/play`, con sus tests.
- (bot) Dos rondas de review corregidas: streams huérfanos, desconexión y movida del bot de canal, carreras entre `/play` simultáneos e identidad de la cola en el timer.
- (bot) Decisión: los use-cases reciben el `appContext` entero por constructor; `architecture.md` y `code-style.md` actualizados.
- (bot) `TrackEnqueuer` va en su carpeta con su propio test unitario.
- Spec al día con lo construido: si la cola está vacía el bot se muda al canal del usuario; si lo sacan del canal, la cola se borra.
- (bot) Docs de arquitectura, estilo y testing al día con lo construido: app context y client, callbacks de `VoicePlayer`, timer en `GuildQueue`, errores de negocio con texto fijo y test unitario para cada use-case.
