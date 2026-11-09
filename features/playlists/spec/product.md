---
status: done
apps: [bot]
created: 2026-11-09
---

# Playlists

## Contexto

Hoy `/play` acepta un solo video por vez. Para escuchar una playlist completa hay que pegar los links uno por uno.

## Historia de usuario

Como miembro del servidor, quiero pegar el link de una playlist de YouTube o YouTube Music con `/play`, para encolar todas sus canciones de una vez.

## Flujo

1. El usuario escribe `/play url:<link de playlist>`.
2. El bot lee la playlist: su nombre y sus videos, en orden.
3. Encola los videos al final de la cola. Si no sonaba nada, entra al canal y arranca con el primero.
4. Responde cuántas canciones encoló y de qué playlist.

## Reglas de negocio

- Links de playlist aceptados: `youtube.com/playlist?list=<id>` y `music.youtube.com/playlist?list=<id>`, con o sin `www.`/`m.`.
- Un link con `v=` y `list=` sigue encolando solo ese video, como en `play`. Así se comporta `/play` hoy y evita encolar 50 canciones cuando solo se quería compartir una.
- Los mixes y radios generados por YouTube (`list=RD...`) no se aceptan, porque son infinitos y cambian según el usuario. Responden link inválido.
- Se encolan como máximo 100 canciones por playlist, las primeras 100 en orden. Si la playlist tenía más, la respuesta lo dice. Topar las playlists es la convención común de los bots de música.
- Los videos privados, borrados o no disponibles de la playlist se saltan sin error.
- Una playlist inexistente, privada o sin ningún video disponible responde error y no cambia nada.
- Los videos se agregan en el orden de la playlist, todos juntos al final de la cola, y llevan como `requestedBy` a quien la pidió.
- Las demás reglas de `/play` aplican igual: hay que estar en un canal de voz, no se muda de canal mientras suena algo, hay salida por inactividad y un track que falla se salta.

## Decisiones

- **Mismo comando `/play`**: no hace falta un `/playlist` aparte. Los bots populares detectan solos si el link es de un video o de una playlist.
- **Tope de 100**: evita colas enormes por accidente. No se puede elegir desde qué posición se empieza.
- **`watch?v=...&list=...` encola solo el video**: mantiene lo que ya hace `/play`.

## Fuera de alcance

- Mixes y radios de YouTube.
- Elegir un rango o empezar desde el video del link.
- Playlists de otras plataformas (Spotify, SoundCloud).
- Mezclar la playlist al encolar.

## Plan de trabajo recomendado

1. [x] bot: `parseYoutubeUrl` distingue video y playlist, con su test.
2. [x] bot: `AudioSource.resolvePlaylist` en `YtDlpAudioSource`, con su test.
3. [x] bot: `/play` encola playlists (`PlaylistEnqueuer` o extensión de `TrackEnqueuer`), con su test.
4. [x] bot: prueba manual en el servidor (la corre el usuario).
