# gatobotija

Bot de música para Discord, ligero, para un servidor de amigos. Monorepo armado para trabajar con Claude Code.

## Qué trae

```
.
├── CLAUDE.md                 reglas del repo, tabla de apps, flujo de features y formato de reportes
├── log.md                    bitácora general del proyecto: una línea por cambio, por día y por autor
├── .claude/
│   ├── agents/               bot-implementer y bot-reviewer
│   └── skills/               /session-start y /commit
├── features/_templates/      spec/product.md, technical.md, ui.md y log.md
└── apps/
    └── bot/                  bot de música (discord.js, @discordjs/voice, yt-dlp, ffmpeg)
```

`apps/bot` tiene su `CLAUDE.md` (qué doc leer antes de escribir código) y su `docs/`. Se instala siguiendo esos docs (stack en `docs/architecture.md`, scripts en `docs/commands.md`).

## Flujo

- `/session-start <slug>`: abre el trabajo sobre `features/<slug>/`. Claude delega el código a `bot-implementer` y revisa el diff con `bot-reviewer`.
- `/commit`: commit con el formato del repo.
