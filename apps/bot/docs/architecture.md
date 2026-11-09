<!--- cSpell:disable --->

# Arquitectura

Bot ligero para un solo servidor de amigos. Solo reproduce links de YouTube: sin búsqueda por texto ni otras plataformas. Capas clásicas, organizadas por tipo de pieza, sin capa de dominio ni base de datos. TypeScript, Node, discord.js, `@discordjs/voice`, `yt-dlp` y `ffmpeg`.

## Stack

| Pieza | Qué |
|-------|-----|
| Runtime | Node LTS, TypeScript, `tsx` en desarrollo |
| Discord | `discord.js` v14, solo slash commands (sin prefijos ni lectura de mensajes) |
| Voz | `@discordjs/voice` con sus dependencias de opus y cifrado |
| Audio | `yt-dlp` para leer los datos del video de YouTube y obtener el stream, `ffmpeg` para transcodificar. Los dos son binarios del sistema, en el `PATH` |
| Validación | `zod` (config y opciones de los comandos) |
| Logger | `winston` |
| Tests | Vitest |

Nada de Lavalink, base de datos ni dashboard: si algún día hace falta, es una decisión nueva y va primero a este doc.

## Capas

```
src/commands         definen el slash command, leen las opciones, llaman al use-case y responden
        │
        ▼
src/modules/<modulo>/use-cases   reglas ──► src/services   lo externo (voz, audio, logger)
        │
        ▼
src/state            estado en memoria (colas por servidor)
```

- Cada capa solo llama a la de abajo. Un comando nunca llama a un service; un use-case nunca toca la `interaction` de discord.js.
- Los use-cases son los únicos que usan services. Un service no llama a use-cases ni toca el estado.
- Lo compartido va en `src/shared/` (`errors/`, `utils/`, `use-case.ts`).

## Estructura

```
src/
├── commands/
│   ├── <comando>-command.ts           un archivo por slash command: play, skip, stop, queue, pause, resume
│   ├── command.ts                     tipo Command: { data, execute(interaction, appContext) }
│   └── index.ts                       arma el array de commands (no reexporta)
├── events/
│   ├── interaction-create.ts          busca el comando por nombre y lo ejecuta; si lanza, loguea y responde un error genérico
│   └── ready.ts                       loguea que el bot está arriba
├── modules/music/
│   ├── use-cases/<caso-de-uso>.ts     un archivo por caso de uso; si tiene test, va en use-cases/<caso-de-uso>/ con su test e index.ts
│   └── music-errors.ts                errores de negocio del módulo
├── state/
│   ├── guild-queue/                   GuildQueue: la cola de un servidor (tracks, actual, avanzar, limpiar)
│   └── queue-registry/                QueueRegistry: guildId → GuildQueue, crea la cola la primera vez
├── services/<servicio>/               externos (ver "Services"); sus errores en <servicio>-errors.ts
├── config/                            config.ts: valida las variables de entorno (ver "Config"); index.ts lo reexporta (@/config)
├── context/                           app-context.ts; index.ts lo reexporta (@/context)
├── shared/
├── client.ts                          createClient(appContext): arma el Client de discord.js y engancha los events
├── deploy-commands.ts                 registra los slash commands en el servidor (DISCORD_GUILD_ID) con la REST API
└── index.ts                           arranque: config, app context, login y shutdown
```

Un archivo por recurso en cada capa (`play-command.ts`, `music-errors.ts`, `guild-queue.ts`). Si un archivo crece demasiado, se parte por acción dentro de una carpeta del recurso.

## Comandos

- Un `Command` tiene `data` (el `SlashCommandBuilder`) y `execute(interaction, appContext)`.
- Leen las opciones con `interaction.options` tal como llegan; no las validan ni las transforman: eso lo hace el schema del use-case.
- Sacan de la `interaction` lo que el use-case necesita como datos planos (`guildId`, `voiceChannelId` del miembro, `url`) y se lo pasan. El use-case no recibe la `interaction` ni objetos de discord.js.
- Llaman a un solo use-case y responden. Sin `if` de negocio.
- Un comando que solo lee (p. ej. `/queue`) no lleva use-case: lee directo de `appContext.queues` y responde. Si no hay nada, responde la lista vacía, sin error.
- Si la respuesta puede tardar más de 3 segundos (leer los datos de un video), el comando hace `deferReply()` primero y después `editReply()`.
- Responden con `reply(result, render)` (`src/commands/utils/reply.ts`): si `result` es un `BusinessError`, responde su `message` en efímero; si no, responde lo que arma `render(result)`:

  ```ts
  async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
    await interaction.deferReply();

    const trackEnqueuer = new TrackEnqueuer(
      appContext.queues,
      appContext.services.audio,
      appContext.services.voice
    );

    const result = await trackEnqueuer.execute({
      guildId: interaction.guildId,
      voiceChannelId: getVoiceChannelId(interaction),
      url: interaction.options.getString('url', true)
    });

    await reply(interaction, result, track => `Queued **${track.title}**`);
  }

  export const PlayCommand: Command = {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Plays a song or adds it to the queue')
      .addStringOption(option =>
        option.setName('url').setDescription('YouTube link').setRequired(true)
      ),
    execute
  };
  ```

- Un comando nuevo se agrega al array de `src/commands/index.ts`. Para que aparezca en Discord, el usuario corre `yarn commands:deploy`.

## Use-cases

- Una clase por caso de uso, con un solo método `execute` (`TrackEnqueuer.execute`). Naming en `code-style.md` > Naming.
- Extienden `UseCase` (`src/shared/use-case.ts`) con su schema zod (`super(EnqueueTrackSchema)`) y escriben su lógica en `run(input)`. `execute` recibe el input crudo, lo valida con el schema y, si falla, devuelve `InvalidInputError` sin llamar a `run`; si pasa, llama a `run` con el input ya parseado.
- Cada use-case define su schema en su propio archivo, arriba de la clase y sin exportar. No se comparten entre use-cases.
- Reciben por constructor el `QueueRegistry` y después los services que usan.
- Las reglas viven aquí: hay que estar en un canal de voz, no se puede saltar con la cola vacía, al terminar un track arranca el siguiente, al vaciarse la cola el bot sale del canal después de un rato.
- Se instancian donde se usan, con lo que necesitan del app context. No hay un registro de use-cases.

## Links de YouTube

- `/play` solo acepta links de un video de YouTube: `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `music.youtube.com/watch?v=<id>` y `youtube.com/shorts/<id>`, con o sin `www.`/`m.`.
- `parseYoutubeUrl(url)` (`src/shared/utils/youtube-url.ts`) devuelve la URL normalizada (`https://www.youtube.com/watch?v=<id>`) o `null`. Se queda solo con el video: `list=`, `t=` y demás parámetros se ignoran.
- El schema del use-case solo valida que llegue un string no vacío. Si `parseYoutubeUrl` devuelve `null`, `run` devuelve `InvalidYoutubeUrlError` antes de tocar la cola o los services.
- Al `AudioSource` solo le llega la URL ya normalizada.

Casos iniciales: `TrackEnqueuer` (`/play`), `TrackSkipper` (`/skip`), `PlaybackStopper` (`/stop`: vacía la cola y sale del canal), `PlaybackPauser` y `PlaybackResumer`.

## Estado en memoria

- `GuildQueue` es lógica pura, sin discord.js ni services: guarda los tracks, el actual y si está en pausa; expone `add`, `next`, `clear`, `current`, `upcoming`. No reproduce nada.
- `QueueRegistry` mapea `guildId` → `GuildQueue` y crea la cola la primera vez que se pide (`get(guildId)`). Es la única fuente del estado y vive en `appContext.queues`.
- Nada persiste: al reiniciar el bot, las colas empiezan vacías. Es una decisión, no un pendiente.

## Services

Un service es una capa sobre algo externo: la voz de Discord, los datos y el stream de audio, los logs. Permite reemplazarlo por uno falso en los tests sin tocar los use-cases.

- **Sin reglas.** Hace lo que le piden y nada más; cuándo reproducir, qué sigue y cuándo salir lo decide el use-case.
- Los usan solo los use-cases, que los reciben por constructor. Excepción: el logger, que se puede usar desde cualquier capa.
- Si el proveedor falla, el service lanza un error de `services/<servicio>/<servicio>-errors.ts` con el motivo; no lo ignora.
- Un service con un solo proveedor real es una interface y su adapter, más un `dummy/` para tests. Sin factory mientras no haya un segundo proveedor.

```
src/services/
├── audio/
│   ├── audio-source.ts              interface AudioSource: resolve(url) → Track | null (null si el video no existe o no está disponible), stream(track) → Readable
│   ├── yt-dlp/yt-dlp-audio-source.ts    spawnea yt-dlp (y ffmpeg) con child_process
│   └── audio-errors.ts
├── voice/
│   ├── voice-player.ts              interface VoicePlayer: join(guildId, channelId), play(guildId, stream), pause, resume, stop, leave y onIdle(guildId, cb), todos por guildId
│   ├── discord/discord-voice-player.ts  adapter sobre @discordjs/voice
│   ├── dummy/dummy-voice-player.ts      tests: no hace nada, guarda lo que recibe
│   └── voice-errors.ts
└── logger/logger.ts                 createLogger(): info, warn, error(message, error?, meta?)
```

- **Una interface** con los métodos que usan los use-cases, sin tipos del proveedor (nada de `AudioResource` ni `VoiceConnection` afuera del adapter).
- `Track` es un tipo plano propio (`{ title, url, durationSeconds, requestedBy }`) en `src/shared/types/track.ts`.
- `VoicePlayer` lleva un player por servidor dentro del adapter; los use-cases solo pasan el `guildId`.

## App context

`src/context/app-context.ts`. Se arma una sola vez con `createAppContext(config)` en `src/index.ts` y se pasa a `createClient(appContext)`, que se lo da a cada comando.

| Clave | Qué |
|-------|-----|
| `queues` | El `QueueRegistry`. |
| `services` | `audio`, `voice`, `logger`, ya instanciados. |

- Los use-cases no van en el app context: `new TrackSkipper(appContext.queues, appContext.services.voice, appContext.services.audio)`.
- En el shutdown (`SIGINT`/`SIGTERM`) de `src/index.ts`, el bot sale de todos los canales de voz y hace `client.destroy()`.

## Config

- `src/config/config.ts` valida `process.env` con zod y lo mapea a un objeto en camelCase: `config.discord.token`, `config.discord.clientId`, `config.discord.guildId`. Nadie más lee `process.env`.
- Solo valida forma y presencia. Ninguna variable tiene default.
- Las variables están en `commands.md` > Variables de entorno.

## Errores

- Todo error propio extiende `AppError` (`src/shared/errors/app-error.ts`). El mensaje incluye los valores que lo causaron.
- Hay tres tipos:
  - **Errores de negocio**: los que devuelve un use-case por una regla (`NotInVoiceChannelError`, `InvalidYoutubeUrlError`, `TrackNotFoundError`, `QueueEmptyError`). Extienden `BusinessError` y llevan su `code` en SCREAMING_SNAKE_CASE. Su `message` es el texto que ve el usuario en Discord.
  - **Input inválido**: `UseCase.execute` devuelve `InvalidInputError` (`INVALID_INPUT`) con el mensaje de `z.prettifyError`.
  - **Errores de infraestructura**: los de los services (`AudioResolveFailedError`, `VoiceConnectionFailedError`). Extienden `AppError` directo y se lanzan.
- Los use-cases **devuelven** el error de negocio, no lo lanzan: es parte de su tipo de retorno (`Promise<Track | NotInVoiceChannelError | InvalidYoutubeUrlError | TrackNotFoundError>`). El comando lo pasa a `reply`.
- Lo que se lanza llega a `events/interaction-create.ts`, que lo loguea con `logger.error` y responde en efímero un mensaje genérico (`Something went wrong.`), sin detalles ni stack.
- Un error mientras suena un track (el stream se corta, yt-dlp falla) no tumba el bot: se loguea y se pasa al siguiente track.
