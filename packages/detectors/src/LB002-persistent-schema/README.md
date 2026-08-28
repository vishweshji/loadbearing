# LB002 — Persistent Schema Change

## What it detects

Changes that establish or materially alter a persistent data structure: a new table, a new
column on an existing table, a new type/enum, a new index, a new constraint, a new Prisma
model/enum/field, a new Django/Alembic/Rails migration operation.

For files that already existed before the change, only newly *added* lines are scanned (a
simple line-set diff), so editing a comment elsewhere in a migration file does not re-flag a
statement that was already there.

## What it intentionally does not detect

- Whether the schema design itself is good (normalization, indexing strategy, naming).
- Data migrations / backfills that don't change structure.
- Non-persistent, in-memory, or cache-only schemas.
- Full protocol/type-checking of the migration DSLs it scans — these are text/regex scanners
  "sufficient for common declarations," not compilers (see Known false negatives).

## Supported ecosystems

| Ecosystem | Location                                                          | Constructs |
| --------- | ------------------------------------------------------------------ | ---------- |
| SQL       | `*.sql` under a `migrations/`, `db/migrations/`, `database/migrations/`, or `schema/migrations/` directory, at any depth (e.g. `apps/api/db/migrations/*.sql` matches) | `CREATE TABLE`, `ALTER TABLE ... ADD COLUMN`, `CREATE TYPE`, `CREATE INDEX`, `ALTER TABLE ... ADD CONSTRAINT` |
| Prisma    | `schema.prisma`, `**/*.prisma`                                     | new `model`, new `enum`, new field on an existing model (optional vs. required) |
| Django    | `**/migrations/*.py`                                                | `migrations.CreateModel`, `migrations.AddField`, `migrations.AlterField` |
| Alembic   | `**/versions/*.py`, `**/alembic/*.py`                               | `op.create_table`, `op.add_column`, `op.alter_column` |
| Rails     | `db/migrate/**/*.rb`                                                | `create_table`, `add_column`, `change_column`, `add_reference` |

No repository code is executed for any of these — Python, Ruby, and Prisma files are scanned as
text, not run.

## Default severity

`HIGH` for everything except a new **optional** field on an existing Prisma model, which is
`MEDIUM` (a new required field is still `HIGH`, since it constrains every existing row/writer).

## Example

```text
LB002 Persistent schema change

HIGH

db/migrations/20260828_customer_identity.sql

Introduces persistent schema change: CREATE TABLE customer_identity

Why this matters:
Future application behavior and integrations may depend on this data model. Changing its
ownership or meaning later may require migration and coordination.
```

## Known false positives

- A `.sql` file placed under a matching migrations directory but containing only read queries
  that happen to embed one of the matched keywords in a string literal or comment.
- A Prisma field whose type merely gets a doc comment added directly above it can, in rare
  formatting, be picked up if the parser's line-based field regex misreads a comment as a field
  — this is uncommon but possible with unusual formatting.

## Known false negatives

- SQL Server bracket-quoted identifiers (`CREATE TABLE [dbo].[Orders]`) are not matched — only
  unquoted, double-quoted, single-quoted, and backtick-quoted identifiers are.
- A schema change expressed through a raw/custom migration runner that doesn't match any of the
  supported constructs (e.g. a hand-rolled `ALTER TABLE ... ADD COLUMN` split across an
  unusual multi-statement macro) may not be detected.
- Rails migrations outside the conventional `db/migrate/` directory are not scanned.
- Django/Alembic files outside a `migrations/`/`versions/`/`alembic/` directory are not scanned.
