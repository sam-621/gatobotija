---
status: active
apps: [bot]
created: 2026-11-09
---

# Play

## Contexto

Lo central del bot: que cualquiera en el servidor pueda poner una canción de YouTube en el canal de voz donde está, y que las siguientes se encolen y suenen en orden.

## Historia de usuario

Como miembro del servidor, quiero pegar un link de YouTube con `/play`, para escucharlo con los demás en el canal de voz.

## Flujo

1. El usuario entra a un canal de voz y escribe `/play url:<link de YouTube>`.
2. El bot valida que sea un link de un video de YouTube y lee su título y duración.
3. Si no sonaba nada, entra al canal del usuario y empieza a reproducir. Si ya sonaba algo, lo agrega al final de la cola.
4. Responde qué puso o en qué posición quedó.
5. Al terminar una canción, arranca la siguiente de la cola.
6. Si la cola se vacía, el bot se queda en el canal y, tras 5 minutos sin nada nuevo, sale.

## Reglas de negocio

- Solo links de un video de YouTube: `youtube.com/watch?v=`, `youtu.be/`, `music.youtube.com/watch?v=` y `youtube.com/shorts/` (ver `apps/bot/docs/architecture.md` > Links de YouTube). Cualquier otra cosa responde error y no cambia nada.
- Sin búsqueda por texto.
- Un link de playlist con `v=` encola solo ese video; sin `v=`, es link inválido.
- Hay que estar en un canal de voz para usar `/play`.
- Si el bot ya está en un canal de voz del servidor y el usuario está en otro, responde error: no se muda de canal mientras suena algo. Si está esperando con la cola vacía, se muda al canal del usuario.
- Si sacan al bot del canal y no se reconecta, la cola se borra.
- Video privado, borrado o con restricción que impida reproducirlo: error "no encontrado" y no se encola.
- Si un track falla mientras suena, se salta al siguiente; el bot no se cae.
- Una cola por servidor, en memoria. Se pierde al reiniciar.

## Decisiones

- **Solo YouTube y solo links**: el bot es para un grupo de amigos; buscar por texto o soportar otras plataformas agrega complejidad que no hace falta.
- **Salir del canal tras 5 minutos con la cola vacía**: no dejar el bot colgado en el canal para siempre.
- **No se muda de canal**: evita que alguien en otro canal se robe el bot a mitad de una canción.

## Fuera de alcance

- Playlists completas.
- Búsqueda por texto y otras plataformas (Spotify, SoundCloud).
- Controles (`/skip`, `/stop`, `/pause`, `/resume`): feature `playback-controls`.
- Ver la cola (`/queue`, `/nowplaying`): feature `queue-view`.
- Límite de duración o de tamaño de cola.

## Plan de trabajo recomendado

1. [x] bot: `GuildQueue` y `QueueRegistry` con sus tests.
2. [x] bot: `parseYoutubeUrl` con su test.
3. [x] bot: service `audio` (`AudioSource`, `YtDlpAudioSource`) con su test.
4. [x] bot: service `voice` (`VoicePlayer`, `DiscordVoicePlayer`, `DummyVoicePlayer`) con su test.
5. [x] bot: `TrackEnqueuer`, avance automático al terminar un track y salida por inactividad.
6. [x] bot: `/play` con su test.
7. [ ] bot: prueba manual en el servidor (la corre el usuario).
