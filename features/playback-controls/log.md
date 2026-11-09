# Playback controls — log

## 2026-11-09 — samuel.corrales621

**Hecho:**
- Se crea la feature con su spec.
- Pasos 1 a 3: `TrackSkipper`, `PlaybackPauser`, `PlaybackResumer`, `PlaybackStopper` y los comandos `/skip`, `/pause`, `/resume`, `/stop`, con tests.
- `TrackSkipper` reusa `QueueAdvancer`; `GuildQueue` gana `pause()`/`resume()`; `VoicePlayer` gana `pause`, `resume`, `stop`.
- Error nuevo `NotInBotVoiceChannelError` para el canal distinto en los controles (`/play` sigue con `DifferentVoiceChannelError`).
- `/resume` con nada sonando responde `Nothing is paused.`; `ui.md` y `technical.md` actualizados.
- Review: corregidos orden y nombre de tests en `guild-queue.test.ts`.
- `apps/bot/docs/architecture.md` al día: `GuildQueue.pause()`/`resume()`, use-case que llama a otro en el flujo principal y cuándo el voice player lanza o ignora la falta de conexión.
- Paso 4: probado en el servidor, todo funciona. Se cierra la feature.
