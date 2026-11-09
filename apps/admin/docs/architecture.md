<!--- cSpell:disable --->

# Arquitectura

SPA en React + Vite + Tailwind v4 + TypeScript que consume `apps/api` por GraphQL, con TanStack Query, React Router, React Hook Form + zod e i18next.

## Estructura

```
src/
├── app/          app.tsx (rutas), app.css (tema de Tailwind v4), providers, query client y error boundary
├── lib/
│   ├── api/      fetcher, operations, codegen, errors y tipos (compartido por todos los módulos)
│   └── <módulo>/ una carpeta por dominio
├── shared/       componentes, hooks, contexts, guards, i18n y utils compartidos
└── main.tsx
```

## Módulo

```
src/lib/<módulo>/
├── pages/        <nombre>-page.tsx, una por ruta
├── components/   <componente>/<archivo>.tsx, agrupados por pantalla o pieza
├── hooks/        use-<acción>.ts, uno por query o mutation
├── constants/    cache-keys.ts y constantes del módulo
└── utils/        <tema>.utils.ts, funciones puras
```

- Las rutas se registran en `src/app/app.tsx` importando la página del módulo.
- Las guards de ruta están en `src/shared/guards/` (p. ej. `protect.tsx` para rutas con sesión, `public.tsx` para rutas sin sesión). Se montan como ruta contenedora (`<Route element={<Protect />}>...</Route>`): renderizan `<Outlet />` o redirigen con `<Navigate replace>`. Sus piezas auxiliares (como `guard-loading.tsx`) van en la misma carpeta.
- `@/` apunta a `src/`.

## API

- **Operations:** cada query, mutation y fragment se declara con `graphql(...)` en `src/lib/api/operations/<dominio>.operations.ts`.
- **Tipos:** `yarn gen:types` los genera en `src/lib/api/codegen/` a partir del schema de `apps/api`. Se importan desde `@/lib/api/types`. Los fragments se leen con `getFragmentData(FRAGMENT, data)`.
- **Fetcher:** `src/lib/api/fetcher.ts` hace el request con credenciales a `VITE_API_URL`. `useGqlQuery` y `useGqlMutation` (`src/shared/hooks/`) lo envuelven sobre TanStack Query.
- **Errores:** la API devuelve los errores de negocio en `apiErrors` del payload de la mutation (`{ apiErrors: [{ code, message }], <entidad> }`). Cada dominio tiene `src/lib/api/errors/<dominio>.errors.ts` con `get<Dominio>Error(code)`, que traduce ese `code` a un `ApiError` con mensaje para el usuario. Un `code` nuevo en la API se agrega aquí.
- **Errores de un cliente que no es GraphQL** (p. ej. el cliente de una librería de auth): se traducen en el mismo `<dominio>.errors.ts` por el `status` HTTP (429 → `TOO_MANY_REQUESTS`) y devuelven `ApiError | null`: `null` cae en `GENERIC_ERROR`.

## Hooks

### Query

```ts
export const useGetProducts = () => {
  const result = useGqlQuery(GET_PRODUCTS_QUERY, {
    key: [ProductCacheKeys.Products]
  });

  const products =
    result.data?.products.items.map(p => getFragmentData(COMMON_PRODUCT_FRAGMENT, p)) ?? [];

  return { products, ...result };
};
```

### Mutation

- Devuelve `Promise<ActionResult<XErrorCode>>`: `{ isSuccess: true }` o `{ isSuccess: false, error, errorCode }`.
- Si el payload trae un error en `apiErrors`, se traduce con `get<Dominio>Error(code)`. Si todo sale bien, se refrescan las queries afectadas por sus cache keys con `refetchQueries`. La excepción es lo que cambia la sesión (login, logout): ahí se usa `invalidateQueries`, para que las guards reaccionen.
- Errores inesperados: `Logger.error(error)` y `GENERIC_ERROR`.

```ts
export const useRemoveProduct = () => {
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useGqlMutation(REMOVE_PRODUCT_MUTATION);

  const removeProduct = async (productId: string): Promise<ActionResult<ProductErrorCode>> => {
    try {
      const { removeProduct } = await mutateAsync({ productId });
      const [apiError] = removeProduct.apiErrors;

      if (apiError) return { isSuccess: false, ...getProductError(apiError.code) };

      await queryClient.refetchQueries({ queryKey: [ProductCacheKeys.Products] });
      return { isSuccess: true };
    } catch (error) {
      Logger.error(error);
      return { isSuccess: false, error: GENERIC_ERROR };
    }
  };

  return { removeProduct, isLoading: isPending };
};
```

### Mutation sobre un cliente que no es GraphQL

Usa `useMutation` de TanStack Query sobre ese cliente en vez de `useGqlMutation`, y devuelve el mismo `ActionResult`. Si el cliente no lanza y devuelve `{ data, error }`, el hook lee `error` y lo traduce con `get<Dominio>Error` solo si el dominio tiene un code para esa acción; si no, todo error va a `Logger.error` y `GENERIC_ERROR`. Las URLs de callback van absolutas (`${window.location.origin}/...`).

### Cache keys

Cada módulo define `constants/cache-keys.ts` con un objeto `<Módulo>CacheKeys`. Nunca strings sueltos como key.

## Componente `<X>Details` (crear y editar)

Cada entidad editable tiene un solo componente `<X>Details` que sirve para crear y para editar. Si recibe la entidad, edita; si no, crea.

Mientras solo se cree una entidad y no se edite, su formulario sigue la forma de [formularios que no son `<X>Details`](#formularios-que-no-son-xdetails). Cuando llegue la edición, pasa a `<X>Details`.

```
components/details/
├── <x>-details.tsx           el componente: provider + Form + layout de la página
├── use-<x>-details-form.ts   use<X>DetailsForm, use<X>DetailsFormContext, schema y FormValues
├── actions/                  acciones del header (remove, archive...)
│   └── remove/
│       ├── remove-<x>.tsx
│       └── use-remove-<x>-button.ts
└── <sección>/                una carpeta por card o pieza del formulario
```

### Páginas

Las dos páginas renderizan el mismo componente:

```tsx
export const NewProductPage = () => <ProductDetails />;

export const ProductDetailsPage = () => {
  const { id } = useParams() as { id: string };
  const { isLoading, product } = useGetProduct(id);

  if (!isLoading && !product) return <NotFound />;

  return <ProductDetails product={product} />;
};
```

### `use-<x>-details-form.ts`

Sigue la forma de los hooks de formulario (ver abajo):

- `use<X>DetailsForm(entity)`: `useForm` con `zodResolver(Schema)` y `defaultValues` tomados de la entidad o vacíos.
- `onSubmit` vive en el hook: si hay entidad, llama al hook de update y hace `form.reset(values)`; si no, llama al de create y navega a `/<ruta>/<id>`.
- `use<X>DetailsFormContext()`: une `useFormContext<FormValues>()` con el contexto de la página. Las secciones lo usan para leer el form y la entidad sin recibir props.

### Secciones y acciones

- Cada sección es una card en su carpeta y lee el form con `use<X>DetailsFormContext()`.
- Cada acción tiene un componente y un hook `use<Acción><X>Button` que llama al hook de mutation, notifica y navega si hace falta.

## Formularios que no son `<X>Details`

Un formulario que no edita una entidad (login, búsqueda) tiene su hook en un archivo junto al componente, sin provider ni contexto:

```
components/<pieza>/
├── <pieza>-form.tsx          solo UI
├── use-<pieza>-form.ts       use<Pieza>Form, schema y FormValues
└── <sub-pieza>/              una carpeta por pieza que muestra el form
    └── <sub-pieza>.tsx
```

- `use<Pieza>Form(params)`: sigue la forma de los [hooks de formulario](#hooks-de-formulario), con `defaultValues` vacíos.
- Los mensajes del schema son keys de i18n y se muestran con `t(errors.<campo>.message)`.

## Modales con formulario

Un formulario que se abre en un modal tiene un componente `<acción>-<x>-dialog/` con el `Dialog` de coss, su botón y su estado abierto/cerrado adentro. El formulario va aparte, con la forma de [formularios que no son `<X>Details`](#formularios-que-no-son-xdetails):

```
components/
├── new-<x>-dialog/
│   └── new-<x>-dialog.tsx    Dialog + DialogTrigger + DialogHeader, y el estado isOpen
└── <x>-form/
    ├── <x>-form.tsx          Form envolviendo DialogPanel (campos) y DialogFooter (botones)
    └── use-<x>-form.ts
```

- El modal se cierra desde el formulario con un callback por parámetro: `<ProductForm onSuccess={() => setIsOpen(false)} />`. "Cancel" es un `DialogClose`.
- Después de guardar no se navega: la mutation refresca la cache y la pantalla de atrás se actualiza sola.

## Diálogos de confirmación

Una confirmación sin formulario usa el `AlertDialog` de coss en su propio componente `<acción>-<x>-dialog/`:

- Si se abre desde un botón propio, el componente lleva el trigger y su estado `isOpen` adentro, igual que un modal con formulario.
- Si la abre otra acción (por ejemplo, descartar cambios al cambiar de página), el padre la monta con `open` y le pasa los callbacks de confirmar y cancelar.
- Mientras corre la acción, el botón de confirmar muestra carga. Si falla, el error se ve dentro del diálogo, sin cerrarlo.

## Hooks de formulario

Todo hook de formulario (`<X>Details` u otro) vive en un solo archivo `use-<nombre>-form.ts`, sin carpeta, y tiene la misma forma:

- El hook tiene adentro la mutation y el `onSubmit`, que se devuelve ya envuelto con `form.handleSubmit`.
- Si el submit falla, el error va con `form.setError('root', { message: result.error })`: así `isSubmitSuccessful` queda en `false` y RHF limpia `errors.root` en el siguiente submit. No hay estado `submitError` aparte.
- El componente lee el error de `form.formState.errors.root?.message` y el éxito de `form.formState.isSubmitSuccessful` (por ejemplo, para mostrar un estado "enviado" en lugar del form). `form.reset()` vuelve al form vacío.
- Devuelve `{ form, isLoading, onSubmit, ... }`: `form` es el resultado de `useForm` sin spread, y al lado lo demás que use el componente.
- El schema de zod y `type FormValues = z.infer<typeof Schema>` van en el mismo archivo, debajo del hook. No hay `form-schema.ts`.
- Lo que llega de afuera (callbacks) entra por parámetro.
- El componente solo arma la UI: `<Form onSubmit={onSubmit}>` y lee `form.register`, `form.formState`, etc.

```ts
export const useProductForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { createProduct, isLoading } = useCreateProduct();

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '' }
  });

  const onSubmit = async (values: FormValues) => {
    const result = await createProduct(values);

    if (!result.isSuccess) return form.setError('root', { message: result.error });

    onSuccess();
  };

  return { form, isLoading, onSubmit: form.handleSubmit(onSubmit) };
};

const Schema = z.object({
  name: z.string().trim().min(1, 'Enter a name')
});

type FormValues = z.infer<typeof Schema>;
```

## UI

- Componentes de `src/shared/components/ui` (coss ui). Si falta uno, se agrega desde el registry `@coss`, no se escribe a mano. Ver `docs/design-system.md`.
- Íconos a través de un solo wrapper, `@/shared/components/icons/icons`. Si falta un ícono, se agrega al wrapper; las pantallas no importan la librería de íconos directo.
- Tailwind v4: el tema vive en `app.css` con `@theme`. No existe ni se crea `tailwind.config.js`.
