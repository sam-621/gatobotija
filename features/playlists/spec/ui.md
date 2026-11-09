# Playlists — UI

Capacidades que debe tener la interfaz en Discord (slash commands, opciones y respuestas), sin formato concreto. Reglas de negocio en `product.md`; aquí se referencian, no se repiten.

Las capacidades (qué recibe, qué responde, estados) son obligatorias. La forma (texto plano, embed, botones, efímero o no) es una propuesta: si se resuelve distinto, se actualiza este archivo para reflejar lo construido.

## Cambios a comandos existentes

### /play

- **Hoy:** solo acepta links de un video.
- **Cambia:** también acepta links de playlist. Ejemplo: `https://music.youtube.com/playlist?list=PLxxxxxxxx`.
- **Responde** (visible para todos):
  - Si no sonaba nada: `Queued **24** tracks from **Chill Mix**. Now playing **Song A** (3:21)`.
  - Si ya sonaba algo: `Queued **24** tracks from **Chill Mix**.`
  - Con más de 100 canciones, se agrega: `(only the first 100)`.
  - Con duración desconocida, se omite el `(m:ss)`.
- **Estados** (efímeros):
  - Link que no es de video ni de playlist, o es un mix: `Only YouTube video or playlist links are supported.` Reemplaza el texto actual de link inválido.
  - Playlist no disponible o vacía: `That playlist is not available.`
  - El resto, igual que en `play`.
