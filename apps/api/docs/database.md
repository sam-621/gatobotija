<!--- cSpell:disable --->

# Base de datos

Postgres con Drizzle. Schema en `src/persistence/schema/`, migraciones en `database/migrations/` generadas con drizzle-kit (`drizzle.config.ts`: `dialect: 'postgresql'`, `schema: './src/persistence/schema/index.ts'`, `out: './database/migrations'`).

## Migraciones

- Se cambia el schema y se crea con `yarn migrate:make <nombre_en_snake_case>` (`drizzle-kit generate --name`). Se revisa el SQL generado antes de darla por buena.
- Las migraciones generadas no se editan. El SQL que drizzle-kit no sabe generar (`GRANT`/`REVOKE`, `FORCE ROW LEVEL SECURITY`, funciones, triggers, datos) va en una migración custom aparte, creada con `yarn migrate:make <nombre> --custom`, justo después de la generada.
- Nunca editar una migración que ya se aplicó en otro ambiente.
- **Aplicarlas (`yarn migrate <config>`) es exclusivo del usuario.** Se le pide y se espera. `scripts/migrate.ts` carga el archivo env que recibe y corre el migrator de `drizzle-orm/node-postgres/migrator` sobre `database/migrations`.
- Drizzle no tiene migraciones de reversa: para deshacer una migración ya aplicada, se crea una nueva que revierta el cambio.

## Tablas y columnas

- Toda tabla tiene `id uuid`, `created_at`, `updated_at` y, si se borra lógicamente, `deleted_at`.
- Las fechas son `timestamp with time zone`. `updated_at` lleva `defaultNow()` y `$onUpdate(() => new Date())`.
- Columnas y tablas en snake_case y en singular (`order_line`). Plural solo si el singular es palabra reservada en Postgres (`orders`, `users`).
- En el schema de Drizzle, las propiedades en camelCase y el nombre de la columna en snake_case (`createdAt: timestamp('created_at', { withTimezone: true })`).
- FKs con su `ON DELETE` explícito.

## Queries

- Toda query paginada termina su `ORDER BY` con una columna única (`id`). Sin eso, `LIMIT/OFFSET` pierde y duplica filas entre páginas.
- `created_at` no sirve para desempatar: es `now()`, que en Postgres es el inicio de la transacción, así que todo lo insertado en una misma transacción comparte el valor.
- Índices sobre FKs que se usan para filtrar o hacer join.
- Un filtro sin distinguir mayúsculas compara `lower(<columna>)` y su índice es de expresión sobre `lower(<columna>)`; un índice sobre la columna sola no lo usa.
