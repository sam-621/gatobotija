# Bot setup — UI

Capacidades que debe tener la interfaz en Discord (slash commands, opciones y respuestas), sin formato concreto. Reglas de negocio en `product.md`; aquí se referencian, no se repiten.

## Comandos nuevos

### /ping

- **Opciones:** ninguna.
- **Responde:** `Pong!` con la latencia del websocket (`Pong! 42ms`), visible para todos.
- **Efecto:** ninguno.
- **Estados:** si algo falla, el mensaje genérico efímero `Something went wrong.`.
