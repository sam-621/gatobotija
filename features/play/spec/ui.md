# Play — UI

Capacidades que debe tener la interfaz en Discord (slash commands, opciones y respuestas), sin formato concreto. Reglas de negocio en `product.md`; aquí se referencian, no se repiten.

Las capacidades (qué recibe, qué responde, estados) son obligatorias. La forma (texto plano, embed, botones, efímero o no) es una propuesta: si se resuelve distinto, se actualiza este archivo para reflejar lo construido.

## Comandos nuevos

### /play

- **Opciones:** `url` (string, obligatoria). Ejemplo: `https://youtu.be/dQw4w9WgXcQ`.
- **Responde** (visible para todos):
  - Si no sonaba nada: `Now playing **Never Gonna Give You Up** (3:33)`.
  - Si ya sonaba algo: `Queued **Never Gonna Give You Up** (3:33) at position 2`.
- **Efecto:** entra al canal del usuario y reproduce, o agrega al final de la cola. Al terminar sigue con la próxima; tras 5 minutos con la cola vacía sale del canal (sin mensaje).
- **Estados** (todos efímeros):
  - Sin canal de voz: `You need to be in a voice channel.`
  - Link que no es de un video de YouTube: `Only YouTube video links are supported.`
  - Bot en otro canal: `I'm already playing in another voice channel.`
  - Video no disponible: `That video is not available.`
  - Fuera de un servidor o error inesperado: `Something went wrong.`
