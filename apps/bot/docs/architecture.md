<!--- cSpell:disable --->

# Arquitectura

Bot ligero para un solo servidor de amigos. Solo reproduce links de YouTube: sin búsqueda por texto ni otras plataformas. Capas clásicas, organizadas por tipo de pieza, sin capa de dominio ni base de datos. TypeScript, Node, discord.js, `@discordjs/voice`, `yt-dlp` y `ffmpeg`.

## Stack

| Pieza | Qué |
|-------|-----|
| Runtime | Node LTS, TypeScript 6.0 (no 7: typescript-eslint todavía no la soporta), ESM (`"type": "module"`), `tsx` en desarrollo y `tsup` para la build. El `.env` se carga con `--env-file` de Node/tsx, sin dotenv |
| Discord | `discord.js` v14, solo slash commands (sin prefijos ni lectura de mensajes) |
| Voz | `@discordjs/voice`. Sin librería de opus ni de cifrado: el audio llega ya en Ogg/Opus (`StreamType.OggOpus`) y el cifrado sale de `node:crypto` |
| Audio | `yt-dlp` para leer los datos del video de YouTube y obtener el stream, `ffmpeg` para transcodificar. Los dos son binarios del sistema, en el `PATH` |
| Validación | `zod` (config y opciones de los comandos) |
| Logger | `winston` |
| Tests | Vitest |
| Deploy | Railway con un `Dockerfile` propio: imagen de Node, `ffmpeg` por `apt-get` y el binario oficial de `yt-dlp` bajado de su release de GitHub en cada build, así cada deploy trae el más reciente. Nada de paquetes npm que empaqueten los binarios ni paquetes del builder de Railway (traen un yt-dlp viejo). Todavía no está armado |

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
│   ├── utils/reply.ts                 reply(interaction, result, render)
│   └── index.ts                       arma el array de commands (no reexporta)
├── events/
│   ├── interaction-create.ts          onInteractionCreate(appContext, commands): busca el comando por nombre y lo ejecuta; si lanza, loguea y responde un error genérico
│   └── ready.ts                       onReady(appContext): loguea que el bot está arriba
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
├── client.ts                          createClient(): arma el Client de discord.js; registerEvents(client, appContext): engancha los events
├── deploy-commands.ts                 registra los slash commands en el servidor (DISCORD_GUILD_ID) con la REST API
└── index.ts                           arranque: config, app context, login y shutdown
```

Los events son factories: reciben lo que necesitan (`appContext` y, en `interaction-create`, la lista de `commands`) y devuelven el listener que `client.ts` engancha. Así el test les pasa comandos falsos.

Un archivo por recurso en cada capa (`play-command.ts`, `music-errors.ts`, `guild-queue.ts`). Si un archivo crece demasiado, se parte por acción dentro de una carpeta del recurso.

## Comandos

- Un `Command` tiene `data` y `execute(interaction, appContext)`. `data` se tipa de forma estructural (`name` + `toJSON()`) para aceptar un `SlashCommandBuilder` con o sin opciones; en la práctica siempre es un `SlashCommandBuilder`.
- Leen las opciones con `interaction.options` tal como llegan; no las validan ni las transforman: eso lo hace el schema del use-case.
- Sacan de la `interaction` lo que el use-case necesita como datos planos (`guildId`, `voiceChannelId` del miembro, `url`) y se lo pasan. El use-case no recibe la `interaction` ni objetos de discord.js.
- Llaman a un solo use-case y responden. Sin `if` de negocio.
- Un comando que solo lee (p. ej. `/queue`, `/ping`) no lleva use-case: lee directo de `appContext.queues` (o de la `interaction`) y responde. Si no hay nada, responde la lista vacía, sin error.
- Si la respuesta puede tardar más de 3 segundos (leer los datos de un video), el comando hace `deferReply()` primero y después `editReply()`.
- Responden con `reply(interaction, result, render)` (`src/commands/utils/reply.ts`): si `result` es un `BusinessError`, responde su `message` en efímero; si no, responde lo que arma `render(result)`.
- Efímero se marca con `flags: MessageFlags.Ephemeral` (`ephemeral: true` está deprecado en discord.js 14).
- Si la interaction está diferida, la respuesta normal va con `editReply`. Un error efímero no puede salir con `editReply`, porque hereda la visibilidad del `deferReply`: se borra la respuesta diferida (`deleteReply()`) y se manda con `followUp` efímero. `reply` y el error genérico de `interaction-create` lo hacen así:

  ```ts
  async function execute(interaction: ChatInputCommandInteraction, appContext: AppContext) {
    await interaction.deferReply();

    const trackEnqueuer = new TrackEnqueuer(appContext);

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
- Reciben por constructor el `appContext` entero y de ahí sacan el `QueueRegistry` y los services que usan.
- Las reglas viven aquí: hay que estar en un canal de voz, no se puede saltar con la cola vacía, al terminar un track arranca el siguiente, al vaciarse la cola el bot sale del canal después de un rato.
- Se instancian donde se usan, pasándoles el `appContext`. No hay un registro de use-cases.
- Un use-case puede crear otros para los callbacks de voz que registra: `TrackEnqueuer` engancha `onIdle` → `QueueAdvancer` y `onDisconnect` → `QueueReleaser`. El callback atrapa y loguea lo que se lance.
- Un use-case también puede llamar a otro en su flujo principal para reusar su lógica, sin duplicarla: `TrackSkipper` llama a `QueueAdvancer.execute` con `await` y suma a su tipo de retorno los errores que ese devuelva (p. ej. `InvalidInputError`).

## Links de YouTube

- `/play` solo acepta links de un video de YouTube: `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `music.youtube.com/watch?v=<id>` y `youtube.com/shorts/<id>`, con o sin `www.`/`m.`.
- También acepta links de playlist: `youtube.com/playlist?list=<id>` y `music.youtube.com/playlist?list=<id>`, con o sin `www.`/`m.`. Los mixes (`list` que empieza con `RD`) no se aceptan.
- `parseYoutubeUrl(url)` (`src/shared/utils/youtube-url.ts`) devuelve `{ kind: 'video', url }`, `{ kind: 'playlist', url }` o `null`.
  - Un video se normaliza a `https://www.youtube.com/watch?v=<id>`. Si hay `v=`, el link es de video: `list=`, `t=` y los demás parámetros se ignoran.
  - Una playlist se normaliza a `https://www.youtube.com/playlist?list=<id>`.
- El schema del use-case solo valida que llegue un string no vacío. Si `parseYoutubeUrl` devuelve `null`, `run` devuelve `InvalidYoutubeUrlError` antes de tocar la cola o los services.
- Al `AudioSource` solo le llega la URL ya normalizada.

Casos iniciales: `TrackEnqueuer` (`/play`), `TrackSkipper` (`/skip`), `PlaybackStopper` (`/stop`: vacía la cola y sale del canal), `PlaybackPauser` y `PlaybackResumer`.

## Estado en memoria

- `GuildQueue` es lógica pura, sin discord.js ni services: guarda los tracks, el actual, el canal de voz y si está en pausa; expone `add`, `next`, `clear`, `pause`, `resume`, `current`, `upcoming`. `pause` y `resume` solo fijan el estado y no hacen nada sin track actual. No reproduce nada.
- `GuildQueue` también guarda el timer de inactividad (`startIdleTimeout(cb, ms)` / `cancelIdleTimeout()`); `add` y `clear` lo cancelan. Qué hace el callback lo decide el use-case.
- `QueueRegistry` mapea `guildId` → `GuildQueue` y crea la cola la primera vez que se pide (`get(guildId)`). `find(guildId)` la devuelve o `null` sin crearla (para comprobar que la cola sigue siendo la misma tras un `await`) y `guildIds()` lista los servidores con cola. Es la única fuente del estado y vive en `appContext.queues`.
- Nada persiste: al reiniciar el bot, las colas empiezan vacías. Es una decisión, no un pendiente.

## Services

Un service es una capa sobre algo externo: la voz de Discord, los datos y el stream de audio, los logs. Permite reemplazarlo por uno falso en los tests sin tocar los use-cases.

- **Sin reglas.** Hace lo que le piden y nada más; cuándo reproducir, qué sigue y cuándo salir lo decide el use-case.
- Los usan solo los use-cases, que los sacan del `appContext` que reciben por constructor. Excepción: el logger, que se puede usar desde cualquier capa.
- Si el proveedor falla, el service lanza un error de `services/<servicio>/<servicio>-errors.ts` con el motivo; no lo ignora.
- Un service con un solo proveedor real es una interface y su adapter, más un `dummy/` para tests. Sin factory mientras no haya un segundo proveedor.

```
src/services/
├── audio/
│   ├── audio-source.ts              interface AudioSource: resolve(url) → Track | null (null si el video no existe o no está disponible), resolvePlaylist(url) → { title, tracks, truncated } | null (null si la playlist no existe o es privada), stream(track) → Readable
│   ├── yt-dlp/yt-dlp-audio-source.ts    spawnea yt-dlp (y ffmpeg) con child_process
│   └── audio-errors.ts
├── voice/
│   ├── voice-player.ts              interface VoicePlayer: join, play, leave, onIdle, onDisconnect, onChannelChange (y pause, resume, stop desde playback-controls), todos por guildId
│   ├── discord/discord-voice-player.ts  adapter sobre @discordjs/voice
│   ├── dummy/dummy-voice-player.ts      tests: no hace nada, guarda lo que recibe y expone emitIdle/emitDisconnect/emitChannelChange para disparar los callbacks
│   └── voice-errors.ts
└── logger/logger.ts                 createLogger(): info, warn, error(message, error?, meta?)
```

- **Una interface** con los métodos que usan los use-cases, sin tipos del proveedor (nada de `AudioResource` ni `VoiceConnection` afuera del adapter).
- `Track` es un tipo plano propio (`{ title, url, durationSeconds, requestedBy }`) en `src/shared/types/track.ts`.
- `VoicePlayer` lleva un player por servidor dentro del adapter; los use-cases solo pasan el `guildId`.
- Los callbacks de `VoicePlayer` avisan, no deciden: `onIdle` cuando el `AudioPlayer` pasa a `Idle`; `onDisconnect` cuando la conexión cae y no vuelve en 5 s o la destruyen desde afuera (un `leave` propio no lo dispara); `onChannelChange` cuando mueven al bot a otro canal. El service nunca toca el estado: el use-case actualiza o libera la cola.
- Sin conexión en el servidor, los métodos que dejan de sonar o salen (`stop`, `leave`) no hacen nada, porque el resultado ya es el que se pedía. Los que necesitan audio activo (`play`, `pause`, `resume`) lanzan `VoiceNotConnectedError`.

## App context

`src/context/app-context.ts`. Se arma una sola vez en `src/index.ts`: `createClient()`, después `createAppContext(config, client)` (el voice necesita el client) y `registerEvents(client, appContext)`, que se lo da a cada comando.

| Clave | Qué |
|-------|-----|
| `queues` | El `QueueRegistry`. |
| `services` | `audio`, `voice`, `logger`, ya instanciados. |

- Los use-cases no van en el app context: `new TrackSkipper(appContext)`.
- En el shutdown (`SIGINT`/`SIGTERM`) de `src/index.ts`, corre `QueueReleaser` por cada servidor de `queues.guildIds()` y hace `client.destroy()`.
- `deploy-commands.ts` también arma el app context (con un client sin login), solo para usar el logger.

## Config

- `src/config/config.ts` expone `loadConfig()`, que valida `process.env` con zod y lo mapea a un objeto en camelCase: `config.nodeEnv`, `config.discord.token`, `config.discord.clientId`, `config.discord.guildId`. Nadie más lee `process.env`.
- Solo valida forma y presencia (los IDs de Discord, solo dígitos). Ninguna variable tiene default.
- Si falla, lanza `InvalidConfigError` (definido sin exportar dentro de `config.ts`) con el detalle de `z.prettifyError`, que nombra la variable.
- Las variables están en `commands.md` > Variables de entorno.

## Errores

- Todo error propio extiende `AppError` (`src/shared/errors/app-error.ts`). El mensaje de los errores de infraestructura incluye los valores que lo causaron; el de los de negocio es el texto fijo que define el `ui.md` de la feature.
- Hay tres tipos:
  - **Errores de negocio**: los que devuelve un use-case por una regla (`NotInVoiceChannelError`, `InvalidYoutubeUrlError`, `TrackNotFoundError`, `QueueEmptyError`). Extienden `BusinessError` y llevan su `code` en SCREAMING_SNAKE_CASE. Su `message` es el texto que ve el usuario en Discord.
  - **Input inválido**: `UseCase.execute` devuelve `InvalidInputError` (`INVALID_INPUT`) con el mensaje de `z.prettifyError`.
  - **Errores de infraestructura**: los de los services (`AudioResolveFailedError`, `VoiceConnectionFailedError`). Extienden `AppError` directo y se lanzan.
- Los use-cases **devuelven** el error de negocio, no lo lanzan: es parte de su tipo de retorno (`Promise<Track | NotInVoiceChannelError | InvalidYoutubeUrlError | TrackNotFoundError>`). El comando lo pasa a `reply`.
- Lo que se lanza llega a `events/interaction-create.ts`, que lo loguea con `logger.error` y responde en efímero un mensaje genérico (`Something went wrong.`), sin detalles ni stack.
- Un error mientras suena un track (el stream se corta, yt-dlp falla) no tumba el bot: se loguea y se pasa al siguiente track.
