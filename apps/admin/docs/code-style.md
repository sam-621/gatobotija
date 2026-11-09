<!--- cSpell:disable --->

# Estilo de código

Aplica a todo código nuevo. Si un archivo existente lo contradice, manda este doc.

## General

- **Sin comentarios.** Ni explicativos, ni JSDoc, ni `TODO`. Solo si el usuario lo pide, y solo el que pidió.
- **Código en inglés**: nombres, strings y valores. El texto visible pasa por i18n.
- Sin `any`; `unknown` + narrowing.
- Sin non-null assertion (`!`).
- `import type` para lo que solo es tipo.
- Variables sin usar con prefijo `_`.
- `@/` para importar fuera del módulo; relativos dentro del mismo módulo.

## Formato e imports

- Comillas simples, ancho 100, sin trailing commas, 2 espacios (`.prettierrc`).
- `yarn lint:fix` ordena los imports (`simple-import-sort`): side effects → `node:` → `react` y externos → `@/...` → `../` → `./` → CSS. No se ordenan a mano.

## Naming

| Qué | Regla | Ejemplo |
|-----|-------|---------|
| Archivos y carpetas | kebab-case | `product-form/use-product-form.ts` |
| Página | `<Nombre>Page` en `pages/<nombre>-page.tsx` | `ProductsPage` |
| Hook | `use<Acción>` en `hooks/use-<acción>.ts` | `useRemoveProduct` |
| Componente | PascalCase, exportado por nombre | `ProductDetailsSubmitButton` |
| Cache keys | `<Módulo>CacheKeys` | `ProductCacheKeys.Products` |
| Operation | SCREAMING_SNAKE_CASE con sufijo `_QUERY`, `_MUTATION` o `_FRAGMENT` | `REMOVE_PRODUCT_MUTATION` |
| Utils | `<tema>.utils.ts` | `price.utils.ts` |

- Exports con nombre, sin `export default`.
- Componentes como `export const X = () => {...}`.

## i18n

- Todo texto visible usa `t('...')` de `react-i18next`. La key es el texto en inglés: `t('Save')`.
- Cada key nueva se agrega en todos los archivos de `src/shared/i18n/locales/`.
- Español neutro, sin voseo.
- El idioma elegido se guarda en `localStorage` desde `src/shared/i18n/i18n.ts`.
