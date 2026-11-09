---
status: active
apps: [bot]
created: 2026-11-09
---

# Playback controls

## Contexto

Con `/play` funcionando, hace falta controlar lo que suena: saltar una canción, pausar, seguir y cortar todo.

## Historia de usuario

Como miembro del servidor, quiero saltar, pausar, reanudar o detener la música, para controlarla sin esperar a que termine la cola.

## Flujo

1. Mientras suena algo, el usuario escribe `/skip`, `/pause`, `/resume` o `/stop`.
2. El bot aplica la acción y responde qué hizo.

## Reglas de negocio

- Hay que estar en el mismo canal de voz que el bot para usar cualquier control.
- `/skip`: pasa a la siguiente; si no hay siguiente, se detiene y aplica la salida por inactividad de `play`.
- `/pause`: solo si está sonando. `/resume`: solo si está en pausa.
- `/stop`: vacía la cola, corta lo que suena y el bot sale del canal en el momento.
- Con nada sonando, `/skip`, `/pause` y `/stop` responden error.
- Cualquiera en el canal puede usar los controles: sin roles ni votación.

## Decisiones

- **Sin votación para saltar ni roles de DJ**: es un servidor de amigos.
- **`/stop` sale del canal de una vez**: cortar todo es una intención clara; no hace falta esperar los 5 minutos.

## Fuera de alcance

- Saltar a una posición, quitar un track concreto, mezclar, loop, volumen.
- Votación o permisos por rol.

## Plan de trabajo recomendado

1. [ ] bot: `TrackSkipper` y `/skip` con su test.
2. [ ] bot: `PlaybackPauser`, `PlaybackResumer`, `/pause` y `/resume` con sus tests.
3. [ ] bot: `PlaybackStopper` y `/stop` con su test.
4. [ ] bot: prueba manual en el servidor (la corre el usuario).
