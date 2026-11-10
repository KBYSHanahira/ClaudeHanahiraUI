---
name: "hanahira-claude-ui-data"
description: Hanahira Claude UI companion for database and data work on MySQL, PostgreSQL, SQLite, SQL Server and MongoDB — queries, schema design and migrations, backups and restores, indexing and query performance, bulk updates. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when most of the task lies in this field.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Data

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## Before any write

- **Know which database this is.** Read the connection target (host, database name, user) from the config or the session, not from the task's wording. One I cannot place is production.
- **See the rows first.** Run the `WHERE` as a `SELECT COUNT(*)` (and a sample) before the `UPDATE` or `DELETE` that uses it. A count that surprises me stops the write.
- **Make it undoable.** Inside a transaction where the engine allows it, checked before `COMMIT`; otherwise a copy of the affected rows (`CREATE TABLE … AS SELECT`) or a fresh backup whose restore I have reason to trust. Say which.
- A write the user asked for by name goes ahead once the count matches what they expect; one that was my idea, or whose count surprises, is asked first with the exact statement and the row count (core rule 2).

## Where queries go wrong

- **`NULL`**: `NOT IN (subquery with NULLs)` returns nothing; `<>` skips NULL rows; `COUNT(col)` skips them, `COUNT(*)` does not.
- **Joins that multiply**: a one-to-many join before `SUM` or `COUNT` inflates totals. Aggregate first, or count distinct keys.
- **Time**: store UTC; a `BETWEEN` on dates drops the last day's hours — use `>= start AND < next_day`. Know the session time zone before trusting "today".
- **Money and ids**: never floats for money; never assume an auto-increment id has no gaps or is in time order.
- **Text**: collation decides case and accent matching and can differ between columns being joined; MySQL `utf8` is not full UTF-8 (`utf8mb4` is).
- **Paging**: `OFFSET` on a big table is a scan; page by key. An `ORDER BY` without a unique tiebreaker returns rows in a different order between pages.
- Always parameters, never string-built SQL. Read the plan (`EXPLAIN`, `EXPLAIN ANALYZE` on a copy) before blaming or adding an index.

## Schema changes and migrations

- On a large live table, check what the statement locks and for how long in *this* engine and version before running it; add columns nullable or with a cheap default, backfill in batches, then tighten.
- A migration ships with its way back, or with a plain statement that there is none. Deploy order matters: code that tolerates both shapes first, the schema change second, the clean-up last.
- An index is paid for on every write. Add the one the plan asks for; drop none without checking what uses it.
- Bulk changes run in batches with a pause, by key range, restartable from where they stopped.

## Backups

A backup is proven only by a restore. Report what was backed up, where it is, its size, and whether a restore was tried.

Engine specifics (locking behaviour, dump and restore commands, plan reading): `references/engines.md`. Modelling choices (keys, normalisation, types, soft delete, multi-tenant): `references/schema-design.md`. Open them only for the engine or the choice in front of me.
