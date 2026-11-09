> Fuente de verdad de la UI de apps/admin. Si un componente existente lo contradice, manda este doc.

# Sistema de diseño

Componentes y tokens de [coss ui](https://coss.com/ui) (sobre Base UI), con el color de marca del proyecto.

## De dónde salen los componentes

- Registry: `@coss` → `https://coss.com/ui/r/{name}.json`, configurado en `components.json`.
- Catálogo y ejemplos: https://coss.com/ui. Índice completo del registry: https://coss.com/ui/r/registry.json.
- Agregar o actualizar un componente, dentro de `apps/admin`:

  ```bash
  npx shadcn@latest add @coss/<nombre>
  ```

- Los componentes quedan en `src/shared/components/ui`, los hooks en `src/shared/hooks` y las utils en `src/shared/utils`. Si el CLI deja algo fuera de esos alias, se mueve y se corrigen los imports.
- No se escriben a mano componentes base que coss ya trae, ni se usan los de Radix o shadcn. Si coss no tiene el componente, se arma propio con tokens, en el módulo que lo usa o en `src/shared/components/` si se comparte. Las piezas propias que componen los de coss (como `Brand`) van en `src/shared/components/`, fuera de `ui/`. Los íconos viven en `src/shared/components/icons/icons.tsx`; un componente de logo con colores propios va en su propio archivo junto a ellos (exportar un componente desde `icons.tsx` rompe `react-refresh/only-export-components`). Los assets estáticos que no son SVG van en `public/`.
- Después de agregar uno, revisar lo que el CLI instala de más (fuentes que no se usan, un duplicado de `cn`). Eso no se deja.
- Las primitivas de Base UI usan `render` en lugar de `asChild`: `<Button render={<Link to="/" />}>`.

## Componentes instalados

Lista de los componentes de coss que tiene la app. Se actualiza cada vez que se agrega uno.

## Tokens

Viven en `src/app/app.css` (Tailwind v4, sin `tailwind.config.js`).

- **Colores de coss, sin cambios:** `background`, `foreground`, `card`, `popover`, `secondary`, `muted`, `accent`, `border`, `input`, `ring`, `destructive`, `info`, `success`, `warning` (cada uno con su `-foreground`), `chart-1..5`, `code` y `sidebar-*`, en `:root` y `.dark`.
- **Marca:** `--color-brand` y `--color-brand-ink` (texto sobre la marca). `primary` y `primary-foreground` apuntan a ellos en los dos temas. Es el único cambio sobre los colores de coss.
- Un token propio del producto (p. ej. colores de un editor o de estados) se agrega aquí con su nombre y en `:root` y `.dark`.
- **Fuentes:** `font-sans`, `font-mono` y `font-heading`. Se cargan en `index.html`.
- **Tema oscuro:** clase `.dark` en un ancestro (`@custom-variant dark (&:where(.dark, .dark *))`). El usuario elige oscuro, claro o sistema: `src/shared/utils/theme.utils.ts` lo guarda en `localStorage` y pone o quita `.dark` en el `<html>`; `main.tsx` lo aplica al arrancar y `useTheme` lo cambia.

## Reglas

- Colores solo por token (`bg-primary`, `text-muted-foreground`). Nada de literales (`#fff`, `bg-blue-500`) en pantallas.
- Excepción: assets de marca o de terceros (logos, banderas) pueden llevar sus colores propios.
- El color de marca se usa con `primary` o `brand`, nunca con un valor copiado.
- Campos de email con `inputMode="email"` y no `type="email"`: el `Form` de Base UI cancela el submit con la validación nativa y muestra su propio mensaje sin traducir. La validación la hace el schema de zod.
- Un grupo de opciones (tema, idioma) va en `Fieldset` con `FieldsetLegend` tipografiado como `FieldLabel` (`text-base/4.5 font-medium sm:text-sm/4`), así se ve igual que la etiqueta de un campo. Las opciones son `ToggleGroup` sin borde con ícono y texto; el seleccionado usa `data-pressed:bg-accent`, texto `foreground` e ícono `solid`, y el resto `text-muted-foreground`.
- Si ningún componente de coss sirve porque la pieza no debe verse como un control (por ejemplo, una celda que se edita en el lugar), se usa el elemento nativo (`input`, `button`) sin estilos propios, con tokens y su `aria-label`.
- Mientras no haya `ToastProvider` en los providers, los avisos de una acción van en línea con `Alert`.
- Los archivos que trae coss (`src/shared/components/ui` y sus hooks y utils) se dejan tal como vienen del registry: su estilo de código, sus textos y sus excepciones de lint en `eslint.config.js`. La excepción son sus animaciones, que se pueden ajustar; al actualizar uno con el CLI hay que conservarlas. Las reglas de `code-style.md` aplican al código propio.
