<!--- cSpell:disable --->

# Testing

## Suites

| Suite | Sufijo | Comando | Cuándo |
|-------|--------|---------|--------|
| unit | `*.test.ts(x)` | `yarn test` | utils, hooks y componentes con lógica |
| e2e | `*.spec.ts` en `e2e/tests/` | `yarn test` dentro de `e2e/` | flujos completos en el navegador, contra el entorno aislado (ver `e2e/CLAUDE.md`) |

- Siempre solo los tests de lo que se tocó, nunca la suite completa.

## Unit

- Vitest + React Testing Library, entorno jsdom.
- Setup en `tests/setup.ts`; render con `tests/render.tsx`, que envuelve con los providers de la app. `setup.ts` trae los polyfills que jsdom no tiene y Base UI necesita (como `PointerEvent`).
- El test va junto al archivo (`price.utils.ts` → `price.utils.test.ts`).
- Se prueba lo que el usuario ve y hace (`getByRole`, `userEvent`), no detalles de implementación.
- La API se mockea en el borde (el fetcher), nunca los hooks del módulo. Un cliente que no es GraphQL (p. ej. el de auth) se mockea en su archivo de `src/lib/api/`, que es su borde.
- Cada `test(...)` empieza con `renders`, `shows`, `does`, `does not` o el verbo real de la acción.
- Páginas: un test por página con su estado vacío, su estado con datos y sus errores visibles.
