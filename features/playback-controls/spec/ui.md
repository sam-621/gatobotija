# Playback controls — UI

Capacidades que debe tener la interfaz en Discord (slash commands, opciones y respuestas), sin formato concreto. Reglas de negocio en `product.md`; aquí se referencian, no se repiten.

Las capacidades (qué recibe, qué responde, estados) son obligatorias. La forma (texto plano, embed, botones, efímero o no) es una propuesta: si se resuelve distinto, se actualiza este archivo para reflejar lo construido.

Errores comunes a los cuatro (efímeros): `You need to be in a voice channel.`, `You need to be in my voice channel.`. `/skip`, `/pause` y `/stop` con nada sonando: `Nothing is playing.`

## Comandos nuevos

### /skip

- **Opciones:** ninguna.
- **Responde:** `Skipped. Now playing **Song B** (4:12)` o `Skipped. The queue is empty.`
- **Efecto:** suena la siguiente o se detiene.

### /pause

- **Opciones:** ninguna.
- **Responde:** `Paused **Song A**.`
- **Estados:** ya en pausa: `Already paused.` (efímero).

### /resume

- **Opciones:** ninguna.
- **Responde:** `Resumed **Song A**.`
- **Estados:** no está en pausa, incluso con nada sonando: `Nothing is paused.` (efímero).

### /stop

- **Opciones:** ninguna.
- **Responde:** `Stopped and cleared the queue.`
- **Efecto:** vacía la cola y el bot sale del canal.
