# apps/bot

Bot de música para Discord: slash commands para reproducir, encolar y controlar música en un canal de voz.

## Antes de escribir código

| Si vas a... | Lee |
|-------------|-----|
| Escribir o mover comandos, use-cases, estado de reproducción o services | `docs/architecture.md` |
| Escribir cualquier código | `docs/code-style.md` |
| Escribir o correr tests | `docs/testing.md` |
| Correr cualquier comando | `docs/commands.md` |

## Reglas que aplican siempre

- La lógica va en `src/modules/<modulo>/use-cases`. Los comandos solo leen las opciones, llaman al use-case y responden. `src/services` es solo para lo externo (voz de Discord, búsqueda y stream de audio, logger), sin reglas.
- Sin base de datos: el estado (colas por servidor) vive en memoria y se pierde al reiniciar.
- Sin comentarios en el código.
- Nunca levantar el bot ni registrar comandos contra Discord: eso lo corre el usuario.
- Tests: solo los de lo que se tocó, nunca la suite completa.
- No correr `tsc` para verificar ediciones.
