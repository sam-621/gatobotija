# Bot setup — log

## 2026-11-09 — samuel.corrales621

**Hecho:**
- Se crea la feature con su spec.
- Proyecto base de `apps/bot`: scripts, TypeScript, ESLint + Prettier, Vitest y aliases.
- Config validada con zod, logger, errores base, `UseCase` y app context.
- Client, eventos `ready` e `interaction-create`, `reply`, `deploy-commands` e `index.ts` con shutdown.
- `/ping` con su test y utilidades de test (`createInteraction`, `createTestAppContext`).
- Revisión: se corrige el valor esperado del test de `interaction-create`. Quedan decisiones sin documentar en `docs/` (efímero tras `deferReply`, eventos como factories, forma del config, TS 6, ESM, `--env-file`, `MessageFlags.Ephemeral`).
- Se cierra la feature (`status: done`). La prueba manual del paso 5 no está confirmada.
