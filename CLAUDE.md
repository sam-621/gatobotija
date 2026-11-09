# <proyecto>

<Una línea: qué es el proyecto y para quién.>

Monorepo sin workspaces: cada app en `apps/` tiene su propio `package.json`, `node_modules` y `CLAUDE.md`. Los comandos se corren dentro de la app.

## Apps

| App | Qué es | Stack |
|-----|--------|-------|
| `apps/api` | Backend: API, servicio o microservicio | Express, GraphQL Yoga, Drizzle, Postgres |
| `apps/admin` | Frontend con sesión: back office o portal de clientes | React, Vite, Tailwind, coss ui, i18next |

Una app que el proyecto no usa se borra con su carpeta, sus agentes de `.claude/agents/` y su fila en esta tabla. Una app que todavía no está instalada solo tiene `CLAUDE.md` y `docs/`: al instalarla, se arma siguiendo esos docs.

Antes de escribir código en una app, leer su `CLAUDE.md`.

## e2e

`e2e/` es el entorno aislado de pruebas: levanta las apps sobre una DB desechable y con puertos propios. No es una app: no se despliega y solo levanta y prueba las demás. Antes de tocarlo o de usarlo, leer `e2e/CLAUDE.md`.

## Features

`features/<slug>/` guarda el contexto de trabajo que cruza apps:

- `spec/product.md`: contexto, flujo, reglas de negocio, decisiones vigentes y plan de trabajo recomendado. `status` en el frontmatter (`active` | `done`).
- `spec/technical.md`: modelo, API e impacto en código existente.
- `spec/ui.md`: capacidades de la UI y dónde vive, sin estilos.
- `log.md`: bitácora con una entrada por día y por autor.

Plantillas en `features/_templates/`. Una feature se crea solo cuando el usuario lo pide.

El trabajo sobre una feature empieza con `/session-start <slug>`. Sin él, no leer ni escribir en `features/`, salvo que el usuario lo pida. Dentro de esa conversación:

- Al terminar cada tarea, agregarla a la entrada de hoy del autor en `log.md` (`## YYYY-MM-DD — <autor>`, autor = parte antes de la `@` de `git config user.email`). Si la entrada no existe, crearla al final.
- Al terminar un paso del plan de trabajo recomendado, marcarlo `[x]` en `spec/product.md`.
- Al crear la feature, terminar un paso del plan o cerrarla, agregar una línea `[slug]` al log del proyecto. El detalle se queda en el `log.md` de la feature.
- Si el usuario pide en la sesión algo que cambia una regla, decisión, parte técnica o de UI, o que contradice el `spec/` (por ejemplo, algo que estaba fuera de alcance), lo que pide manda: actualizar `product.md`, `technical.md` y `ui.md` sin pedir confirmación. Los cambios a `docs/` de las apps sí siguen necesitando confirmación.
- Conflictos de git en `log.md`: aceptar ambas versiones.

## Log del proyecto

`log.md` en la raíz es la bitácora general del proyecto: a grandes rasgos qué se ha hecho. El detalle de una feature vive en su `log.md`.

- Una entrada por día y por autor (`## YYYY-MM-DD — <autor>`, igual que en features). Si no existe, crearla al final.
- Una línea por cambio, en lenguaje de changelog: qué cambió, no cómo quedó el código. `(app)` al inicio.
- `[slug]` marca que la línea resume trabajo de una feature; sin `[slug]` es un cambio suelto y esa línea es todo su registro.
- Se escribe sin comando, en cualquier conversación:
  - Sin sesión de feature: cada cambio aplicado en código o decisión que alguien que no estuvo en la conversación necesitaría conocer.
  - Con sesión de feature: solo lo que pide la sección Features.
  - No ameritan línea: formato, renombres, tests sueltos, cambios revertidos en la misma conversación.
- Si un cambio suelto necesita más de 2 o 3 líneas para entenderse, avisar que quizá es una feature. No crearla sin que el usuario lo pida.
- Conflictos de git en `log.md`: aceptar ambas versiones.

## Docs de las apps

- La carpeta `docs/` de cada app es la fuente de verdad de cómo se escribe su código. Si un archivo existente lo contradice, manda el doc.
- Si se toma una decisión nueva de arquitectura, estilo o testing, o lo construido ya no coincide con el doc, proponer el cambio al doc y escribirlo solo cuando el usuario confirme.
- Si un comando de `docs/commands.md` todavía no existe en el `package.json`, avisar en vez de inventar otro.

## Reglas generales

- Tocar solo la app en la que se está trabajando, salvo que se pida lo contrario.
- Commits solo con `/commit`.

## Reportes al usuario

- En español neutro, tuteando: sin voseo ni regionalismos.
- Corto y en listas de una línea por ítem: **Quedó** y **Pendiente**.
- No explicar cómo quedó el código ni repetir lo que ya se ve en el diff: el usuario lo lee directo. Si quiere detalle, lo pide.
- No listar lo obvio como pendiente (commitear, que hay cambios sin commitear). Si no queda nada real, se omite Pendiente.
- No hacer preguntas de decisión ni adelantarse a lo que sigue: el usuario marca el rumbo y pide lo que necesita. Riesgos o avisos, una línea cada uno dentro de Pendiente, sin pregunta.
- Aplica también a los reportes que se reenvían de los subagentes.
