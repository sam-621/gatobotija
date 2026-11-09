<!--- cSpell:disable --->

# Arquitectura

Capas clásicas, organizadas por tipo de pieza, sin capa de dominio. La API es GraphQL con GraphQL Yoga sobre Express. TypeScript, Node, Drizzle y Postgres.

## Capas

```
src/api/schema      los .gql del schema de GraphQL
        │
        ▼
src/api/resolvers   llaman al use-case (o al repositorio, si la query solo lee) y responden
        │
        ▼
src/modules/<modulo>/use-cases   reglas de negocio ──► src/services   servicios externos
        │                                                     (auth, billing, storage...)
        ▼
src/persistence/repositories   acceso a datos
```

- Cada capa solo llama a la de abajo. Un resolver nunca llama a un service, ni a un repositorio salvo en una query que solo lee (ver "Resolvers"); un use-case nunca toca el contexto de GraphQL ni `req`/`res`.
- Los use-cases son los únicos que usan services. Un service no llama a use-cases ni a repositorios.
- Lo compartido va en `src/shared/` (`errors/`, `utils/`, `use-case.ts`).

## Estructura

```
src/
├── api/                               todo lo de GraphQL
│   ├── schema/<recurso>.gql
│   ├── resolvers/<recurso>-resolver.ts
│   ├── middlewares/<nombre>/          middlewares de GraphQL que envuelven al resolver
│   ├── plugins/<nombre>.ts            plugins de Yoga (useErrorLogger)
│   ├── utils/api-response.ts          apiResponse: arma el payload { apiErrors, <key> } de las mutations y queries
│   └── codegen.ts                     tipos generados por `yarn gen:types`, no se edita
├── modules/<modulo>/                  un módulo por dominio: use-cases/ y <modulo>-errors.ts
│   ├── use-cases/<caso-de-uso>.ts     un archivo por caso de uso; si tiene test, va en use-cases/<caso-de-uso>/ con su test e index.ts
│   └── <modulo>-errors.ts             errores de negocio del módulo
├── persistence/
│   ├── database.ts                    createDatabase, Database y Transaction
│   ├── schema/                        schema de Drizzle, un archivo por tabla o grupo de tablas, reexportado en index.ts
│   ├── unit-of-work/                  UnitOfWork (ver "Unit of work")
│   └── repositories/<recurso>/        una carpeta por repositorio
│       ├── <recurso>-repository.ts
│       ├── __tests__/                 <recurso>-repository.int.test.ts y fixtures/
│       └── index.ts                   reexporta, se importa como @/persistence/repositories/<recurso>
│   └── repositories/build-repositories.ts   arma todos los repositorios sobre una transacción
├── services/<servicio>/               servicios externos (ver "Services (externos)"); sus errores en <servicio>-errors.ts
├── errors/<recurso>-errors.ts         errores que no son de un módulo ni de un service (sesión)
├── context/                           app-context.ts y request-context.ts; index.ts los reexporta (@/context)
├── config/                            config.ts: valida las variables de entorno y las mapea a un objeto (ver "Config"); index.ts lo reexporta (@/config)
├── shared/
├── app.ts                             createApp(appContext): arma Express
└── index.ts                           arranque: conexiones, app context, server y shutdown
```

Un archivo por recurso en cada capa (`product-resolver.ts`, `product-errors.ts`, `product-repository.ts`). Si un archivo crece demasiado, se parte por acción dentro de una carpeta del recurso.

## HTTP

- `createApp(appContext)` (`src/app.ts`) arma Express y monta las rutas. GraphQL vive en `/graphql`, con Yoga, `logging: false` y sus plugins en `plugins` (`useErrorLogger`).
- CORS de GraphQL con la opción `cors` de Yoga (`{ origin: <url del front>, credentials: true }`), no con el paquete `cors`. Una ruta HTTP que no es de Yoga (p. ej. el handler de una librería de auth) usa el paquete `cors` delante, con `app.all` para que el preflight `OPTIONS` pase.
- Un middleware HTTP nuevo se monta en `createApp`, delante de la ruta que lo necesita.
- `GET /health` responde `200` sin tocar la DB.

## Resolvers

- Usan `args.input` tal como llega, con el tipo del codegen. No lo validan con zod ni lo transforman.
- Llaman a un solo método del use-case y responden. Sin `if` de negocio. De dónde sale el use-case se define con el contexto del request.
- Excepción: si lo que se devuelve ya está en el contexto del request (como la sesión), el resolver lo devuelve directo, sin use-case ni `UnitOfWork`.
- Los use-cases son para las mutations. Una query que solo lee no lleva use-case: el resolver abre el `UnitOfWork` y llama directo al repositorio (`uow.execute(repositories => repositories.product.findMany(...))`). Si lo que busca no existe, devuelve `null` o una lista vacía, sin error. Solo en casos escasos una lectura necesita una regla y va a un use-case.
- Un enum de GraphQL cuyos valores se guardan distinto en la DB (`IN_STOCK` e `in-stock`) se traduce con un enum resolver en el `Resolvers` del recurso (`ProductStatus: { IN_STOCK: 'in-stock', ... }`) y los mismos valores en `enumValues` de `codegen.ts`, así el tipo generado usa los de la DB. Nunca se traduce a mano en el resolver.
- Los tipos de args y resultados salen de `src/api/codegen.ts`, que `yarn gen:types` genera a partir de los `.gql`.
- Una mutation o query que puede fallar por una regla de negocio sigue estos pasos, cada uno con su variable: instancia el `UnitOfWork`, guarda en `result` lo que devuelve el use-case dentro del work y responde con `apiResponse(result, '<key>')` (`src/api/utils/api-response.ts`), donde `<key>` es el campo del recurso en el `<Recurso>Result`:

  ```ts
  async function createProduct(_parent: unknown, args: MutationCreateProductArgs, ctx: Context) {
    const uow = new UnitOfWork(ctx.database);

    const result = await uow.execute(async (_repositories, uowCtx) => {
      const productCreator = new ProductCreator(uowCtx);

      return productCreator.execute(args.input);
    });

    return apiResponse(result, 'product');
  }

  export const ProductResolver: Resolvers = {
    Mutation: {
      createProduct
    }
  };
  ```

- Un resolver que pasa por un middleware se declara como función con nombre arriba del archivo, y el objeto de resolvers solo lo mapea envuelto: `createProduct: requireSession(createProduct)`. El resolver no llama al middleware por dentro.
- Los middlewares de GraphQL (`src/api/middlewares/<nombre>/`) son high-order functions: reciben el resolver y devuelven otro con la misma firma que valida primero y después lo llama. No devuelven nada propio. Si la validación falla, lanzan un error de infraestructura (`UnauthenticatedError`); si pasa y estrecha el tipo del contexto, le pasan al resolver el ctx con su tipo nuevo (`SessionContext`, con `session` no nula), exportado desde la carpeta del middleware.
- `apiResponse` devuelve `{ apiErrors: [{ code, message }], <key>: null }` si `result` es un `BusinessError`, y `{ apiErrors: [], <key>: result }` si no. Es la forma de la respuesta de red: no lleva más tipos que esos.
- Su `.gql` devuelve `<Recurso>Result!` con `apiErrors: [<Recurso>ErrorResult!]!` y el recurso nullable; `<Recurso>ErrorResult` tiene `code: <Recurso>ErrorCode!` y `message: String!`, y el enum `<Recurso>ErrorCode` lista los `code` de los errores de negocio que puede devolver:

  ```graphql
  type Mutation {
    createProduct(input: CreateProductInput!): ProductResult!
  }

  type ProductResult {
    apiErrors: [ProductErrorResult!]!
    product: Product
  }

  type ProductErrorResult {
    code: ProductErrorCode!
    message: String!
  }

  enum ProductErrorCode {
    INVALID_INPUT
    PRODUCT_NAME_ALREADY_TAKEN
  }
  ```

## Use-cases

- Una clase por caso de uso, con un solo método `execute` (`ProductCreator.execute`). Naming en `code-style.md` > Naming.
- Extienden `UseCase` (`src/shared/use-case.ts`) con su schema zod (`super(CreateProductSchema)`) y escriben su lógica en `run(input)`. `execute` recibe el input crudo, lo valida con el schema y, si falla, devuelve `InvalidInputError` sin llamar a `run`; si pasa, llama a `run` con el input ya parseado (recortado, con defaults).
- Cada use-case define su schema en su propio archivo, arriba de la clase y sin exportar. No se comparten entre use-cases: si se repite, se duplica. Validan solo forma (obligatorios, largos, rangos); las reglas que necesitan la DB (nombre repetido, no existe) siguen en `run` con su error propio.
- Reciben por constructor el `UowContext` completo, no solo lo que usan (ver "Unit of work"), y después los services que usan.
- Las reglas de negocio viven aquí. Si una regla la usan varios use-cases, se mueve a `src/shared/` o a un use-case propio.
- No saben de transacciones: eso lo manejan el `UnitOfWork` y los repositorios.
- Se instancian donde se usan, con lo que necesitan del app context (ver "App context"). No hay un registro de use-cases.

## Services (externos)

Un service es una capa de abstracción sobre un proveedor externo: autenticación, logs, billing, almacenamiento de archivos, email, etc. Permite cambiar de proveedor, o usar uno falso en desarrollo y tests, sin tocar los use-cases.

- **Sin reglas de negocio.** Un service hace lo que le piden contra el proveedor y nada más; qué mandar, a quién y cuándo lo decide el use-case.
- Lo usan solo los use-cases, que lo reciben por constructor. Nunca un resolver ni un repositorio. Excepción: el logger, que se puede usar desde cualquier capa.
- Si la carpeta del service lleva el nombre de su archivo principal (`services/logger/logger.ts`), tiene un `index.ts` que lo reexporta y se importa como `@/services/logger`. Lo mismo para cada adapter dentro de su carpeta. Ver `code-style.md` > Carpetas e `index.ts`.
- Si el proveedor falla o la entrada no es válida, el service lanza un error de `services/<servicio>/<servicio>-errors.ts` con el motivo; no lo ignora.
- **Logger:** `createLogger(context)` devuelve un `Logger` con `info`, `warn` y `error(message, error?, meta?)`, que pasa el error por `formatError` (`message`, `name`, `cause`, `stack`) para que salga completo también en el JSON de producción.

Un service sin proveedor externo (p. ej. cifrado con `node:crypto`) es una sola clase (`EncryptionService`), sin interface, adapters ni factory: corre igual en todos los ambientes. Se instancia en `createAppContext` con su parte de la config y queda en `appContext.services`.

Un service con varios proveedores posibles (billing, storage) sigue esta estructura:

```
src/services/<servicio>/
├── <rol>s/
│   ├── <servicio>-<rol>.ts          interface, tipos y factory get<Rol>(config)
│   ├── <proveedor>/                 un adapter por proveedor, cada uno en su carpeta
│   │   ├── <proveedor>-<rol>.ts
│   │   └── index.ts
│   ├── console/                     desarrollo: escribe en el log o trabaja en local
│   └── dummy/                       tests: no hace nada
└── <servicio>-errors.ts
```

- **Una interface** con los métodos que usan los use-cases, sin tipos del proveedor.
- **Un adapter por proveedor**, en `<adapter>/<adapter>-<rol>.ts` con su `index.ts`. Siempre hay uno para desarrollo (consola o local) y uno para tests (dummy), para no depender del proveedor real fuera de producción.
- **Una factory** (`get<Rol>(config)`) que elige el adapter según una variable de entorno, no según `NODE_ENV`. La factory recibe su parte de la config (`get<Rol>(config.<rol>)`), y `src/config/` exige las credenciales del adapter elegido.
- La factory se llama una sola vez, en `createAppContext`, y el service queda en `appContext.services`. De ahí se pasa al constructor del use-case.

## App context

Hay dos contextos, los dos en `src/context/` y se importan desde `@/context`:

- **App context** (`app-context.ts`): lo que vive mientras vive la app. Se arma una sola vez con `createAppContext(databases)` en `src/index.ts` (y en `TestServer`) y se pasa a `createApp(appContext)`, que se lo da a quien lo necesite.
- **Contexto del request** (`request-context.ts`): lo de cada request (la conexión, la sesión si hay). Lo arma la función `context` de Yoga a partir del app context.

El app context lleva, ya instanciados:

| Clave | Qué |
|-------|-----|
| `databases` | Las conexiones a la DB propia. |
| `services` | Los services. Si un service tiene factory, se llama aquí. |

- **Los use-cases no van en el app context.** Se instancian donde se usan, con lo que sacan del app context: `new ProductCreator(uowCtx, appContext.services.storage)`.
- Un service o conexión nuevo se agrega al tipo `AppContext` y a `createAppContext`.
- Las conexiones se crean en `src/index.ts` (y en `TestServer`) y entran al app context. Ningún módulo abre su propia conexión al importarse. Sus pools se cierran en el shutdown de `src/index.ts` (`SIGINT`/`SIGTERM`) y en `TestServer.teardown()`.

## Unit of work

Todo proceso que toca la DB propia corre dentro de un `UnitOfWork` (`src/persistence/unit-of-work/`), que lo aísla en una transacción.

- `new UnitOfWork(database)`. Siempre abre su propia transacción: no recibe una externa.
- `execute(work)`:
  1. Abre la transacción.
  2. Arma los repositorios sobre esa transacción con `buildRepositories(trx)`.
  3. Llama a `work(repositories, uowContext)`.
  4. Hace commit, o rollback si `work` lanza. El error original nunca se tapa con el del rollback.
- `UowContext = { repositories, trx }`. Si el proyecto agrega algo que aplica a toda la transacción (p. ej. variables de sesión de Postgres), va aquí y en `execute`, nunca en los use-cases.
- Quien llama (el resolver) instancia el `UnitOfWork` y, dentro del callback, instancia el use-case con el `UowContext`, lo ejecuta y devuelve el resultado:

  ```ts
  new UnitOfWork(ctx.database).execute((_repositories, uow) =>
    new ProductCreator(uow).execute(args.input)
  );
  ```

- Una lectura de infraestructura que no es un caso de uso (p. ej. resolver la sesión) usa directo los repositorios del callback, sin use-case.
- `buildRepositories(trx)` solo arma los repositorios con la transacción. Un repositorio nuevo se agrega aquí.

## Config

- `src/config/config.ts` valida `process.env` con zod y lo mapea a un objeto en camelCase, agrupado por tema: `config.port`, `config.database.url`, `config.storage.adapter`. Nadie más lee `process.env` ni usa los nombres en mayúsculas.
- Cada service tiene su grupo. Uno con varios proveedores lleva `adapter` y una clave por proveedor con sus credenciales. Su tipo se exporta desde `@/config` (`StorageConfig = Config['storage']`). Un service sin proveedor externo no lleva `adapter`: su grupo tiene solo lo que usa.
- **La config solo valida forma y presencia**: que estén las variables que se necesitan, con el tipo correcto, y las credenciales del adapter elegido. Nada de reglas por ambiente (p. ej. "en production solo tal adapter"): cada ambiente se configura con lo que quiera, pero tiene que configurarlo. Por eso ninguna variable tiene default.

## Repositorios

- Una clase por tabla o agregado de tablas. Solo queries, sin reglas (p. ej. nada de "buscar o crear": eso es del use-case).
- Reciben siempre la transacción (`constructor(trx)`), nunca la conexión.
- Devuelven tipos planos de la tabla.
- Extienden `Repository` (`src/persistence/repositories/repository/`), cuyos métodos son públicos (`findMany`, `findOne`, `insert`, `update`, `remove`) y se usan directo desde el use-case. `findOne` recibe `{ where }` y `findMany` recibe `{ where, orderBy }`, con `orderBy` por columna y `OrderByKey` (`{ updatedAt: OrderByKey.Desc, id: OrderByKey.Asc }`). El repositorio no los envuelve (nada de `findById` o `create` que solo los llamen): agrega solo lo que el base no resuelve, como `lower()` o un join.

## Errores

- Todo error propio extiende `AppError` (`src/shared/errors/app-error.ts`). Los de negocio viven en `modules/<modulo>/<modulo>-errors.ts`; los de un service, en `services/<servicio>/<servicio>-errors.ts`; los demás de infraestructura, en `errors/<recurso>-errors.ts`. El mensaje incluye los valores que lo causaron.
- Hay tres tipos:
  - **Errores de negocio**: los que devuelve un use-case por una regla (`ProductNameAlreadyTakenError`). Extienden `BusinessError` (`src/shared/errors/business-error.ts`) y llevan su `code` en SCREAMING_SNAKE_CASE (`PRODUCT_NAME_ALREADY_TAKEN`), tipado con el enum `<Recurso>ErrorCode` de `@/api/codegen` (`BusinessError<ProductErrorCode>`). Sin mapper: el error ya trae lo que necesita la API.
  - **Input inválido**: los errores de forma no llevan un código por campo. `UseCase.execute` devuelve `InvalidInputError` (`src/shared/errors/invalid-input-error.ts`, código `INVALID_INPUT`) con el mensaje de `z.prettifyError`, que dice qué campo falló. Cada `<Recurso>ErrorCode` cuyo use-case valida input incluye `INVALID_INPUT`.
  - **Errores de infraestructura**: sesión (`UnauthenticatedError`, lo lanza el middleware) y services. Extienden `AppError` directo y se lanzan.
- Los use-cases **devuelven** el error de negocio, no lo lanzan: es parte de su tipo de retorno (`Promise<Product | ProductNameAlreadyTakenError>`). El resolver lo pasa a `apiResponse` (ver "Resolvers") y llega al cliente en `apiErrors` del payload con su `code` y `message`.
- Como el error se devuelve, el `UnitOfWork` hace commit: el use-case verifica sus reglas y devuelve el error antes de escribir.
- Lo que no es de negocio sale como error de GraphQL por el handler de Yoga (`src/shared/errors/error-handler.ts`): mapea los `AppError` registrados en `ERROR_CODES` a `extensions: { code }` con su mensaje (p. ej. `UNAUTHENTICATED`). Lo demás responde un error genérico sin detalles (`Unexpected error.`, `INTERNAL_SERVER_ERROR`) en todos los ambientes: nunca sale `originalError`, stack ni causa.
- El plugin `useErrorLogger` (`src/api/plugins/use-error-logger.ts`) loguea con `logger.error` cada error de la respuesta cuyo `originalError` sea un `AppError` o un `Error`, con la ruta y el `path` y `code` de GraphQL. Los `GraphQLError` (validación de la query del cliente) no se loguean. Corre antes del enmascarado, así ve el error original.
- Un error de negocio nuevo no se registra en el handler: su `code` se agrega primero al enum `<Recurso>ErrorCode` del `.gql`, se corre `yarn gen:types` y después se crea la clase.
