# Queue view — UI

Capacidades que debe tener la interfaz en Discord (slash commands, opciones y respuestas), sin formato concreto. Reglas de negocio en `product.md`; aquí se referencian, no se repiten.

Las capacidades (qué recibe, qué responde, estados) son obligatorias. La forma (texto plano, embed, botones, efímero o no) es una propuesta: si se resuelve distinto, se actualiza este archivo para reflejar lo construido.

## Comandos nuevos

### /nowplaying

- **Opciones:** ninguna.
- **Responde** (visible para todos): `Now playing **Song A** (3:33), requested by Ana` y `(paused)` si está en pausa.
- **Estados:** nada sonando: `Nothing is playing.`

### /queue

- **Opciones:** ninguna.
- **Responde** (visible para todos):

  ```
  Now playing: **Song A** (3:33), requested by Ana
  1. **Song B** (4:12), requested by Luis
  2. **Song C** (2:58), requested by Ana
  ...and 5 more
  ```

- **Estados:** nada sonando: `The queue is empty.`
