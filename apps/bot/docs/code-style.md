<!--- cSpell:disable --->

# Estilo de código

Aplica a todo código nuevo. Si un archivo existente lo contradice, manda este doc.

## General

- **Sin comentarios.** Ni explicativos, ni JSDoc, ni `TODO`, ni separadores. Solo si el usuario lo pide, y solo el que pidió.
- **Código y tests en inglés**, incluidos strings, respuestas del bot y valores de prueba.
- **Sin `any`**; `unknown` + narrowing.
- **Sin non-null assertion (`!`)**. Si algo puede ser `null` (`interaction.guildId`, el canal de voz del miembro), se maneja o se usa un helper que lance.
- **Duraciones en segundos** (enteros) en el estado y los tipos propios. Se formatean (`3:45`) solo al responder.
- **Sin parámetros con default solo para que los tests escriban menos.** Si producción siempre pasa el argumento, es requerido.
- **`export` solo si se importa en otro archivo.** No se exporta "por si después se usa". Excepción: las piezas base que pide el spec de una feature para las siguientes (como `UseCase`).
- **En una clase, todo lo que usa va dentro de ella.** Las constantes simples como `private static readonly` (`IDLE_TIMEOUT_MS`), lo que se instancia en el constructor, y las funciones auxiliares como métodos privados. Nada suelto en el módulo, salvo los tipos.

## Formato e imports

- ESLint + Prettier mandan: comillas simples, ancho 100, sin trailing commas, 2 espacios. Correr `yarn lint:fix`; no reordenar imports a mano.
- Grupos de imports (los impone `simple-import-sort`): externos → `@/...` → relativos `../` → relativos `./`.
- `@/` apunta a `src/` y `@tests/` a `tests/` (utilidades de test: `@tests/utils/interaction`). Se usan para cruzar carpetas; relativos solo dentro de la misma carpeta.
- Un alias nuevo se agrega en `tsconfig.json` (`paths`) y en `vitest.config.ts` (`resolve.alias`).
- `import type` para lo que solo es tipo (regla `consistent-type-imports`).
- Argumentos sin usar se prefijan con `_` (`_interaction`).

## Naming

| Qué | Regla | Ejemplo |
|-----|-------|---------|
| Archivos | `<recurso>-<capa>.ts`, con guion y no con punto, así el único punto extra es el de los tests (`<recurso>-<capa>.test.ts`) | `play-command.ts`, `music-errors.ts`, `guild-queue.ts` |
| Comandos | archivo `<comando>-command.ts`, objeto `<Comando>Command`; el nombre del slash command en minúsculas y en inglés | `skip-command.ts`, `SkipCommand`, `/skip` |
| Clases | `<Recurso><Capa>` | `GuildQueue`, `QueueRegistry` |
| Use-cases | una clase por caso de uso, nombrada por lo que hace con sufijo `-er`/`-or`; archivo en kebab-case en `modules/<modulo>/use-cases/`; carpeta con el mismo nombre solo si tiene test | `modules/music/use-cases/track-skipper.ts`, `TrackSkipper` |
| Método del use-case | se llama `execute`, que hereda de `UseCase`; la lógica va en `run` | `new TrackSkipper(appContext).execute(input)` |
| Adapters de un service | `<adapter>/<adapter>-<rol>.ts`, clase `<Adapter><Rol>` | `yt-dlp/yt-dlp-audio-source.ts`, `YtDlpAudioSource` |
| Schemas | `<Acción><Recurso>Schema` | `EnqueueTrackSchema` |
| Error | describe el caso + `Error` | `QueueEmptyError` |
| Conjuntos de valores | objeto `as const` con un tipo del mismo nombre, de preferencia en vez de `enum`; llaves en PascalCase y valores en minúsculas | `PlaybackStatus.Paused`, con valor `'paused'` |

```ts
export const PlaybackStatus = {
  Idle: 'idle',
  Playing: 'playing',
  Paused: 'paused'
} as const;

export type PlaybackStatus = (typeof PlaybackStatus)[keyof typeof PlaybackStatus];
```

Se mantienen con punto los sufijos que piden las herramientas (`.test.ts`, `*.config.ts`) y los fixtures de los tests (`<recurso>.fixtures.ts`, p. ej. `track.fixtures.ts`).

## Carpetas e `index.ts`

- **Carpeta por pieza** cuando la pieza va acompañada de otros archivos, casi siempre su test: `state/guild-queue/` con `guild-queue.ts` y `guild-queue.test.ts`.
- **Barrel `index.ts` solo cuando la carpeta lleva el nombre de su archivo principal.** El `index.ts` hace `export * from './<archivo>'` y se importa por la carpeta:

  | Carpeta | Archivo principal | Import |
  |---------|-------------------|--------|
  | `config/` | `config.ts` | `@/config` |
  | `context/` | `app-context.ts` | `@/context` |
  | `services/logger/` | `logger.ts` | `@/services/logger` |
  | `state/guild-queue/` | `guild-queue.ts` | `@/state/guild-queue` |

- Una carpeta que agrupa varias piezas del mismo nivel (`commands/`, `use-cases/`, `events/`) no lleva barrel: se importa el archivo (`@/modules/music/use-cases/track-skipper`). Su `index.ts`, si existe, no reexporta: arma algo (el array de `commands`).

## Use-case

```ts
const SkipTrackSchema = z.object({
  guildId: z.string().min(1)
});

export class TrackSkipper extends UseCase<typeof SkipTrackSchema> {
  constructor(private readonly appContext: AppContext) {
    super(SkipTrackSchema);
  }

  async run(input: z.output<typeof SkipTrackSchema>): Promise<Track | null | QueueEmptyError> {
    const { queues, services } = this.appContext;
    const queue = queues.get(input.guildId);

    if (!queue.current) return new QueueEmptyError();

    const next = queue.next();

    if (!next) {
      services.voice.stop(input.guildId);

      return null;
    }

    services.voice.play(input.guildId, await services.audio.stream(next));

    return next;
  }
}
```

## Comando

```ts
async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
  const trackSkipper = new TrackSkipper(appContext);

  const result = await trackSkipper.execute({ guildId: interaction.guildId });

  await reply(interaction, result, next => (next ? `Now playing **${next.title}**` : 'Queue ended'));
}

export const SkipCommand: Command = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skips the current song'),
  execute
};
```

## Errores

De negocio (lo devuelve un use-case y llega al usuario como respuesta efímera), con su `code` como primer argumento y el texto para el usuario como segundo:

```ts
export class QueueEmptyError extends BusinessError<MusicErrorCode> {
  constructor() {
    super('QUEUE_EMPTY', 'Nothing is playing.');
  }
}
```

`MusicErrorCode` es un conjunto de valores `as const` en `music-errors.ts` con todos los `code` del módulo.

De infraestructura (services), extiende `AppError` directo:

```ts
export class AudioResolveFailedError extends AppError {
  constructor(url: string, reason: string) {
    super(`yt-dlp failed resolving ${url}: ${reason}`);
  }
}
```
