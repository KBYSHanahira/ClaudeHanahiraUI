# Engine commands

The commands that differ by engine. Check the version first: behaviour, especially of online schema changes, depends on it, and the engine's own documentation for that version outranks this page.

## Orientation

| | PostgreSQL | MySQL / MariaDB | SQLite | SQL Server | MongoDB |
|---|---|---|---|---|---|
| Version | `SELECT version();` | `SELECT VERSION();` | `SELECT sqlite_version();` | `SELECT @@VERSION;` | `db.version()` |
| Where am I | `SELECT current_database(), current_user, inet_server_addr();` | `SELECT DATABASE(), CURRENT_USER(), @@hostname;` | `PRAGMA database_list;` | `SELECT DB_NAME(), SUSER_SNAME(), @@SERVERNAME;` | `db.getName()` · `db.hello()` |
| Tables | `\dt` · `information_schema.tables` | `SHOW TABLES;` | `.tables` | `SELECT name FROM sys.tables;` | `show collections` |
| One table's shape | `\d+ tbl` | `SHOW CREATE TABLE tbl;` | `.schema tbl` · `PRAGMA table_info(tbl);` | `EXEC sp_help 'tbl';` | `db.c.findOne()` · `db.getCollectionInfos({name:'c'})` |
| Indexes | `\di` · `pg_indexes` | `SHOW INDEX FROM tbl;` | `PRAGMA index_list(tbl);` | `EXEC sp_helpindex 'tbl';` | `db.c.getIndexes()` |
| Size | `SELECT pg_size_pretty(pg_total_relation_size('tbl'));` | `information_schema.tables` (`data_length`, `index_length`) | file size | `EXEC sp_spaceused 'tbl';` | `db.c.stats()` |

Row counts from statistics are estimates; `COUNT(*)` is exact and can be slow on a large table.

## Plans

| Engine | Estimated | Actual (runs the query) |
|---|---|---|
| PostgreSQL | `EXPLAIN <q>` | `EXPLAIN (ANALYZE, BUFFERS) <q>` |
| MySQL 8.0.18+ | `EXPLAIN <q>` · `EXPLAIN FORMAT=TREE <q>` | `EXPLAIN ANALYZE <q>` |
| MariaDB | `EXPLAIN <q>` | `ANALYZE <q>` |
| SQLite | `EXPLAIN QUERY PLAN <q>` | — |
| SQL Server | `SET SHOWPLAN_XML ON` | `SET STATISTICS XML ON` then run (add `SET STATISTICS IO, TIME ON` for I/O and timing) |
| MongoDB | `db.c.find(...).explain()` | `.explain('executionStats')` |

"Actual" executes the statement. For a write, wrap it in a transaction and roll back (`BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`) — and that is still a write needing a yes.

Reading them: PostgreSQL — compare `rows=` estimated with actual; `Seq Scan` on a big table and a large gap between the two are the usual findings. MySQL — `type: ALL` is a full scan; `Using filesort` and `Using temporary` are sorts and temp tables. MongoDB — `COLLSCAN` is a full scan; compare `totalDocsExamined` with `nReturned`.

## What is running, and what is blocked

| Engine | Running | Blocking |
|---|---|---|
| PostgreSQL | `SELECT pid, state, wait_event_type, now()-query_start AS age, query FROM pg_stat_activity WHERE state <> 'idle';` | `SELECT pid, pg_blocking_pids(pid) FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;` |
| MySQL | `SHOW FULL PROCESSLIST;` | `SELECT * FROM sys.innodb_lock_waits;` · `SHOW ENGINE INNODB STATUS;` |
| SQL Server | `SELECT * FROM sys.dm_exec_requests;` | `blocking_session_id` in the same view |
| MongoDB | `db.currentOp({active:true})` | `waitingForLock` in the same output |

Cancelling or killing a session is a state change: ask first unless the user named it (core rule 2). In PostgreSQL prefer `pg_cancel_backend(pid)` (stops the query) over `pg_terminate_backend(pid)` (drops the connection).

## Schema changes without a long lock

**PostgreSQL**
- Set `lock_timeout` (for example `SET lock_timeout = '5s';`) before DDL, so a migration waiting for a lock gives up instead of queueing every other query behind it.
- `CREATE INDEX CONCURRENTLY` (not inside a transaction). A failed build leaves an `INVALID` index to drop.
- Adding a column with a constant default is instant from version 11. A volatile default rewrites the table.
- Add a constraint as `NOT VALID`, then `VALIDATE CONSTRAINT` separately; a foreign key likewise.
- `NOT NULL` on a big table: add a `CHECK (col IS NOT NULL) NOT VALID`, validate it, then `SET NOT NULL` (version 12+ uses the check and skips the scan).
- Changing a column type usually rewrites the table: use a new column and a backfill instead.

**MySQL (InnoDB)**
- Ask for what is expected so it fails rather than silently locking: `ALTER TABLE t ADD COLUMN c INT, ALGORITHM=INSTANT;` or `..., ALGORITHM=INPLACE, LOCK=NONE;`. What each operation supports depends on the version; check the "Online DDL operations" table for it.
- DDL commits implicitly and cannot be rolled back.
- For tables too large for native online DDL, `gh-ost` or `pt-online-schema-change`.
- A metadata lock from one long-running transaction can block the `ALTER` and everything queued behind it; check the process list first.

**SQLite**
- `ALTER TABLE` supports rename table, rename column (3.25+), add column, drop column (3.35+). Anything else is: create the new table, copy, drop, rename — inside one transaction, with foreign keys handled as the SQLite documentation's twelve-step procedure describes.
- A single writer at a time. `PRAGMA journal_mode=WAL;` lets readers continue during writes.
- Foreign keys are enforced only with `PRAGMA foreign_keys=ON;` on each connection.

**SQL Server**
- `CREATE INDEX ... WITH (ONLINE = ON)` needs an edition that supports it. Adding a nullable column is a metadata change.

**MongoDB**
- Index builds since 4.2 hold an exclusive lock only briefly at the start and end. On a replica set, watch replication lag.
- There is no enforced schema unless a validator is set; "migration" means updating documents in batches, and code must read both shapes meanwhile.

## Backup and restore

| Engine | Backup | Restore |
|---|---|---|
| PostgreSQL | `pg_dump -Fc -d db -f db.dump` (one database) · `pg_dumpall --globals-only` (roles) | `pg_restore -d newdb db.dump` |
| MySQL | `mysqldump --single-transaction --routines --triggers db > db.sql` (InnoDB; consistent without locking). MySQL with GTIDs, restoring into another server: add `--set-gtid-purged=OFF` — MariaDB's `mariadb-dump` has no such option | `mysql newdb < db.sql` |
| SQLite | `sqlite3 app.db ".backup 'copy.db'"` or `VACUUM INTO 'copy.db';` — never a plain file copy of a live database | Replace the file while nothing has it open |
| SQL Server | `BACKUP DATABASE db TO DISK='...' WITH COPY_ONLY, CHECKSUM;` | `RESTORE DATABASE newdb FROM DISK='...' WITH MOVE ...;` · check first with `RESTORE VERIFYONLY` |
| MongoDB | `mongodump --uri=... --db=db --out=dir` · for a consistent point in time on a replica set, a full dump with `--oplog` (it cannot be combined with `--db` or `--collection`) | `mongorestore --nsFrom='db.*' --nsTo='newdb.*' dir` |

Give credentials through the client's own mechanism (`~/.pgpass`, `~/.my.cnf`, environment variables), never on the command line, where they show in the process list and the shell history. A logical dump of a large database is slow to restore; where recovery time matters, physical backups and point-in-time recovery are the right tool, and the user's existing backup system is the first thing to ask about.

Check a backup at once: the file exists and has a plausible size; for a PostgreSQL custom dump `pg_restore -l db.dump | head`; for SQL `tail -n 3 db.sql` shows the completion comment. The real test is a restore into a scratch database and a row-count comparison.

## Batching a large write

The shape is the same everywhere: walk the primary key in ranges, commit each range.

```sql
-- repeat until 0 rows are affected; sleep briefly between rounds
UPDATE t SET flag = 1
WHERE id IN (SELECT id FROM t WHERE flag = 0 ORDER BY id LIMIT 5000);   -- PostgreSQL, SQLite
UPDATE t SET flag = 1 WHERE flag = 0 ORDER BY id LIMIT 5000;            -- MySQL
UPDATE TOP (5000) t SET flag = 1 WHERE flag = 0;                        -- SQL Server
```

Walking by key range (`WHERE id > :last AND id <= :last + 5000`) is steadier than re-scanning for unprocessed rows. Watch replication lag and lock waits while it runs, and make the job safe to stop and resume.
