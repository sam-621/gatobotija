<!--- cSpell:disable --->

# Comandos

Todos se corren dentro de `apps/bot`. Esta tabla es el contrato de los scripts del `package.json`: si falta uno, se agrega con este nombre.

## Los puede correr el agente

| Comando | Para qué |
|---------|----------|
| `yarn test [ruta]` | Tests (`*.test.ts`). Sin red ni Discord. |
| `yarn lint:check` | Revisa ESLint + Prettier. |
| `yarn lint:fix` | Arregla lint, formato y orden de imports. |
| `yarn build` | Typecheck y build de producción. |

- No correr `tsc --noEmit` para verificar ediciones; el diagnóstico del IDE basta. El typecheck real es `yarn build`.
- Tests: solo los de lo que se tocó, nunca la suite completa (ver `testing.md`).

## Solo los corre el usuario

Todo lo que se conecta a Discord. Si hace falta, se le pide y se espera.

| Comando | Para qué |
|---------|----------|
| `yarn dev` | Levanta el bot en local con `tsx watch`. |
| `yarn start` | Corre la build. |
| `yarn commands:deploy` | Registra los slash commands en el servidor de `DISCORD_GUILD_ID`. Correr cuando se agrega un comando o cambian sus opciones. |

Requisitos del sistema: `ffmpeg` y `yt-dlp` en el `PATH`. `yt-dlp` se actualiza seguido (`yt-dlp -U`) porque YouTube rompe versiones viejas.

## Variables de entorno

Todas son obligatorias y ninguna tiene default (ver `architecture.md` > Config). Se documenta aquí cada una que se agregue, con su `.env.example`.

| Variable | Para qué |
|----------|----------|
| `NODE_ENV` | `development`, `test` o `production`. |
| `DISCORD_TOKEN` | Token del bot. |
| `DISCORD_CLIENT_ID` | Application ID, para registrar los comandos. |
| `DISCORD_GUILD_ID` | Servidor donde se registran los comandos (aparecen al instante, a diferencia de los globales). |
