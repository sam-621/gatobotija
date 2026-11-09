---
name: qa
description: Prueba un flujo de la UI como un humano en el entorno de e2e/ y reporta lo que falla. Usar solo cuando el usuario lo pida (/qa <flujo>).
argument-hint: <flujo>
disable-model-invocation: true
---

# QA

## Pasos

1. Si no hay flujo en el argumento, preguntar cuál se prueba.
2. Dentro de `e2e/`, correr `yarn env:up`. Si el entorno ya está arriba, correr `yarn env:reset`.
3. Delegar al agente `e2e-qa`, pasándole el flujo y el slug de la feature si hay una sesión abierta.
4. Al terminar, correr `yarn env:down`, también si el agente falló.
5. Reportar con el formato de `CLAUDE.md`: en **Quedó** lo probado y en **Pendiente** cada fallo en una línea, con la ruta del screenshot.

## Reglas

- Si `e2e/` todavía no tiene sus scripts (`env:up`, `env:reset`, `env:down`), avisar y parar.
- No arreglar lo que encuentre el agente. Eso lo decide el usuario.
- Un flujo por agente. Si piden varios, correr `yarn env:reset` entre uno y otro.
- Si hay una sesión de feature abierta, agregar los fallos al `log.md`.
