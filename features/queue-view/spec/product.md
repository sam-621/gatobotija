---
status: active
apps: [bot]
created: 2026-11-09
---

# Queue view

## Contexto

Con varias canciones encoladas, la gente quiere saber qué suena y qué viene.

## Historia de usuario

Como miembro del servidor, quiero ver qué está sonando y qué sigue, para saber cuándo toca mi canción.

## Flujo

1. El usuario escribe `/nowplaying` o `/queue`.
2. El bot responde con lo que suena y, en `/queue`, la lista de lo que sigue.

## Reglas de negocio

- No hace falta estar en un canal de voz para ver la cola.
- Con nada sonando, responde que la cola está vacía; no es error.
- `/queue` muestra hasta 10 próximas canciones y, si hay más, cuántas faltan.
- Cada canción muestra título, duración y quién la pidió.

## Decisiones

- **Comandos de solo lectura sin use-case**: leen directo de `appContext.queues`, como dice `apps/bot/docs/architecture.md` > Comandos.
- **Tope de 10 en `/queue`**: el mensaje de Discord tiene límite de largo y no hace falta paginar en un servidor chico.

## Fuera de alcance

- Paginación o botones.
- Barra de progreso o tiempo transcurrido del track actual.

## Plan de trabajo recomendado

1. [ ] bot: `formatDuration` con su test.
2. [ ] bot: `/nowplaying` con su test.
3. [ ] bot: `/queue` con su test.
4. [ ] bot: prueba manual en el servidor (la corre el usuario).
