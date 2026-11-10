# Schema design

A look-up for when designing tables for something new, or judging an existing design. A schema outlives the code written against it, and is the hardest part of a system to change later, so a little care here is the cheapest it will ever be.

## Start from the questions

List what the application will ask of the data — the five or ten queries that matter — and what must never be allowed to be wrong. The tables follow from the first list, the constraints from the second.

## Tables and keys

- **One table per kind of thing**, one row per thing, one column per fact. A fact stored once cannot disagree with itself.
- **Every table has a primary key** that never changes and means nothing: a generated integer (`BIGINT` identity) or a UUID (prefer a time-ordered kind such as UUIDv7 for index locality). Natural values that seem unique — email, national ID, SKU — get a `UNIQUE` constraint instead, because they do change.
- **Relationships are foreign keys**, declared and enforced. Decide `ON DELETE` on purpose: `RESTRICT` by default, `CASCADE` only where the child cannot exist without the parent, `SET NULL` where it can.
- **Many-to-many** is a third table holding the two keys, with a unique constraint on the pair.
- **Normalise first** (to third normal form: every non-key column depends on the key, the whole key, and nothing but the key). Denormalise later, for a measured problem, and write down what keeps the copies in step.

## Types

| Data | Use | Not |
|---|---|---|
| Money | Exact decimal (`NUMERIC(12,2)`) or integer minor units, with the currency in its own column | Floating point |
| Points in time | A zone-aware timestamp (`timestamptz`), or UTC by convention | Local time without a zone; strings |
| Calendar dates (a birthday, a due date) | `DATE` | A timestamp |
| True/false | `BOOLEAN` | `'Y'`/`'N'`, 0/1 in a text column |
| A fixed small set | A lookup table with a foreign key, or a `CHECK` constraint | Free text. Native `ENUM` is awkward to change in MySQL and PostgreSQL |
| Text | PostgreSQL and SQLite: the plain text type, with a `CHECK` on length where a limit is real. MySQL and SQL Server: `VARCHAR(n)` with `n` chosen from the data (indexing `TEXT` there needs a prefix length) | Arbitrary `VARCHAR(255)` |
| Identifiers shown to people (phone, postcode, order number) | Text | Numbers — leading zeros vanish |
| Flexible attributes | A JSON column, for data that is read and written as a whole | JSON for anything filtered, joined or constrained — that wants real columns |

Set the character set to full Unicode (`utf8mb4` in MySQL; `utf8` there is a three-byte subset that rejects emoji and the rarer CJK characters outside the basic plane) and choose the collation on purpose: it decides sorting and whether comparisons ignore case and accents.

## Constraints are the cheapest tests

Put every rule that must always hold into the schema, where no code path can skip it:

- `NOT NULL` on everything that is always known. Nullable is a decision, not a default; `NULL` should mean exactly one thing ("unknown" or "not applicable"), not both.
- `UNIQUE` for what must not repeat — including composite uniqueness ("one vote per user per poll").
- `CHECK` for ranges and relations between columns (`end_at > start_at`, `quantity > 0`). MySQL enforces `CHECK` only from 8.0.16; before that it is parsed and ignored.
- Foreign keys for every reference.

The application still validates, for good error messages. The database constrains, for correctness when two requests race.

## Indexes at design time

- The primary key and unique constraints are indexed automatically. Foreign-key columns are **not** indexed automatically in PostgreSQL; index them when the child is looked up by parent or the parent is ever deleted.
- Add an index for each query from the list at the top that filters or sorts on something else: equality columns first, then the range or sort column.
- Stop there. Add more when a real query plan asks for one.

## Patterns that come up

- **Timestamps**: `created_at` and `updated_at` on most tables; they pay for themselves the first time something goes wrong.
- **Soft delete** (`deleted_at`): only when deleted rows must be recoverable or referenced. It costs a filter on every query and breaks unique constraints unless they are made partial (`UNIQUE ... WHERE deleted_at IS NULL` in PostgreSQL and SQLite, a filtered index in SQL Server; MySQL has no partial indexes and needs a generated column instead).
- **History and audit**: a separate append-only table of changes, written in the same transaction, rather than overwriting.
- **Status fields**: store the state, and constrain the allowed values. If transitions matter, record each one as a row.
- **Multi-tenant**: the tenant key on every table and as the leading column of the indexes and unique constraints, so one tenant can never read or collide with another's rows.
- **Counters and totals**: compute from the rows until that is measurably too slow; a stored total drifts.

## MongoDB and other document stores

Design from the access pattern: data read together is stored together. Embed what belongs to one parent and is bounded in size; reference what is shared, unbounded or updated on its own. A document has a size limit (16 MB in MongoDB) and an array that grows without bound is a design error. Add a schema validator for the fields that must exist, and unique indexes for what must not repeat — the store will not enforce anything that is not declared.

## Naming

Follow the project's existing convention. Without one: lower_snake_case, one choice of singular or plural for tables kept everywhere, `<table>_id` for foreign keys, names that say what the thing is (`shipped_at`, not `date2`), and no reserved words.

## Check the design

Walk each query from the list through the tables: can it be answered, with which index? Then try to insert nonsense — a child without a parent, an end before a start, a duplicate — and confirm the schema refuses each one.
