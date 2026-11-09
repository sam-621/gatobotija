<!--- cSpell:disable --->

# Testing

## Suite

El runner es Vitest. Una sola suite: no hay base de datos ni server que levantar.

| Sufijo | Comando | Qué |
|--------|---------|-----|
| `*.test.ts` | `yarn test [ruta]` | Todo. Nunca toca Discord, YouTube ni la red, ni spawnea `yt-dlp` o `ffmpeg` de verdad. |

- Para correr solo una parte: `yarn test <ruta>`, `-t "<nombre>"`.
- **Siempre solo los tests de lo que se tocó**, nunca la suite completa.
- Las variables de entorno de los tests van fijas en el bloque `env` de `vitest.config.ts`.
- Lo que no se puede probar sin Discord (que el audio suene, que el bot entre al canal) lo prueba el usuario a mano con `yarn dev` en el servidor. Si una tarea lo necesita, se avisa en el reporte.

## Ubicación

- **Sin fixtures:** el test va junto al archivo que prueba (`format-duration.ts` → `format-duration.test.ts`).
- **Con fixtures:** el test va en `__tests__/` junto al archivo, con sus fixtures en `__tests__/fixtures/`.
- Los de comandos van en `tests/commands/<comando>/`.

## Qué se prueba y dónde

| Pieza | Test | Ubicación |
|-------|------|-----------|
| Slash command | con una `interaction` falsa y un app context de test: lo que responde y el efecto en el estado | `tests/commands/<comando>/` |
| Use-case | unit con `createTestAppContext()` (`QueueRegistry` real y services falsos): reglas, orden de errores y efectos en estado y services. El test del comando cubre solo lo del comando (opciones, respuestas, errores efímeros) | junto al archivo |
| `GuildQueue`, `QueueRegistry` | unit, todos los casos: agregar, avanzar, fin de cola, limpiar, pausa | junto al archivo |
| `events/interaction-create.ts` | unit: comando desconocido, comando que lanza → respuesta genérica y `logger.error` | junto al archivo |
| Adapter de un service (`yt-dlp`, `discord`) | con su dependencia mockeada (`child_process`, `@discordjs/voice`): qué recibe y cómo responde a sus errores | junto al archivo |
| Config | unit: que mapee bien y falle si falta una variable | junto al archivo |
| `parseYoutubeUrl` | unit: cada formato aceptado, parámetros ignorados y links que no son de YouTube | junto al archivo |
| Otras utilidades con lógica propia (`format-duration`) | unit | junto al archivo |

No se testean:

- **Definiciones de `SlashCommandBuilder`** sueltas: el nombre y las opciones se cubren en el test del comando.
- **`deploy-commands.ts`, `client.ts` e `index.ts`**: arranque y cableado contra Discord; se prueban a mano.
- **Logger**: envoltorio de winston.
- **Adapters que no hacen nada** (`dummy`).

## Reglas generales

- Orden del archivo: happy path primero, failures después, sin intercalar.
- Cada `test(...)` empieza con `returns`, `does`, `does not` o el verbo real de la acción (`adds`, `skips`, `replies`, `leaves`). Nunca una paráfrasis.
- Antes de inventar un setup, copiar el del test más parecido que ya exista.
- El `describe` raíz lleva el nombre de la pieza y, si no es obvio por el nombre, qué tipo de pieza es: `/play - Command`, `GuildQueue`.
- El valor esperado de un `expect` va escrito tal cual (`toBe('Queued **Song A**')`), nunca en una constante o variable del test, para leerlo sin ir a buscarlo. Las constantes de fixtures sirven para armar el input, no como valor esperado. Excepción: valores que genera el sistema y no se conocen de antemano, que se comparan contra la variable donde se leyeron.
- Sin timers reales: lo que depende del tiempo (salir del canal tras un rato inactivo) usa `vi.useFakeTimers()` y `vi.advanceTimersByTime(...)`; `vi.useRealTimers()` en `afterEach`.

## Tests de comandos

Son el equivalente a un e2e: prueban el comando de punta a punta sin Discord.

- Setup: `createTestAppContext()` (`tests/utils/app-context.ts`) en `beforeEach`, con `QueueRegistry` real, `DummyVoicePlayer`, un `AudioSource` falso y un logger con `vi.fn()`; `vi.restoreAllMocks()` en `afterEach`.
- La `interaction` sale de `createInteraction({ command, options, guildId, voiceChannelId, wsPing })` (`tests/utils/interaction.ts`), que devuelve un objeto con `reply`, `deferReply`, `editReply`, `deleteReply` y `followUp` como `vi.fn()` (actualizan `deferred`/`replied` como discord.js) y las opciones que pide el test. Nunca se arma una `interaction` a mano en el test.
- El estado previo (una cola con tracks, un track sonando) se arma con el `QueueRegistry` del app context antes de ejecutar, usando los tracks de los fixtures.
- Qué devuelve `AudioSource` se controla con `vi.spyOn(appContext.services.audio, 'resolve')` y `mockResolvedValue(...)`, o `mockRejectedValue(new <Error>(...))` para el error.
- Se verifica:
  1. **La respuesta:** el texto exacto con que se llamó `reply`/`editReply`/`followUp`, y `flags: 64` (`MessageFlags.Ephemeral`) en los errores de negocio.
  2. **El efecto en el estado:** cómo quedó la cola (`current`, `upcoming`, pausa), o que no cambió.
  3. **Lo que recibió la voz:** las llamadas que guardó `DummyVoicePlayer` (`join`, `play`, `stop`, `leave`), porque es el efecto real del bot.
- Un solo happy path por variante real (p. ej. `/play` con la cola vacía y con algo sonando), y un test por cada `code` de error distinto. Si varios inputs inválidos dan el mismo `code`, basta con uno.
- Cierre obligatorio de todo comando que necesita voz, al final del archivo:
  1. **Sin canal de voz:** el usuario no está en un canal → `NotInVoiceChannelError`, sin cambios en la cola.
  2. **Fuera de un servidor:** `guildId` nulo (DM) → respuesta de error, sin cambios.

## Tests de adapters

- **Dependencia mockeada** con `vi.hoisted` + `vi.mock('<paquete>')`, así el mock existe antes de que el adapter la importe:

  ```ts
  const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));

  vi.mock('node:child_process', () => ({ spawn }));
  ```

- Se verifica qué recibe la dependencia (los argumentos de `yt-dlp`, el `joinVoiceChannel` con su `channelId`) y que sus fallos salgan como el error del service (`AudioResolveFailedError`). Nunca se llama al proveedor real.

## Fixtures

- Viven en `fixtures/` junto al test, en `<recurso>.fixtures.ts` (con punto: `track.fixtures.ts`), como un objeto `as const` `<X>Fixtures` con datos realistas (`TrackFixtures.SongA`).
- Los tracks compartidos por varios tests de comandos van en `tests/fixtures/track.fixtures.ts`.
- Si un caso necesita datos nuevos, se agregan al objeto de fixtures existente; nada de objetos ad-hoc dentro del test.
- Excepción: los `Command` falsos del test de `interaction-create` se arman dentro del test, porque solo existen para probar el ruteo.
