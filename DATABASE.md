# Database Contract

SQLite (`data/termudrive.db`) is the source of truth. WAL, foreign keys and a busy
timeout are enabled. Migrations run inside transactions and a timestamped backup
is created before upgrading an existing database.

Core tables: `schema_migrations`, `accounts`, `oauth_credentials`, `local_files`,
`remote_files`, `file_mappings`, `jobs`, `job_files`, `upload_sessions`, `history`,
`notifications`, `settings`, `metrics`, and `idempotency_keys`.

Important invariants:

- mappings are unique by `(local_file_id, account_id)` and remote IDs are unique
  per account;
- a job file belongs to exactly one job and captures size/mtime/fingerprint;
- queue claims use a random claim token and transaction; only its owner can finish;
- one active job file cannot be claimed twice;
- resumable session URI and acknowledged offset are committed after every chunk;
- secrets are never selected by public snapshot queries.

Retention: raw metrics are kept for 24 hours, five-minute aggregates for 30 days.
Completed queue records remain as history until the user clears them. Backups are
stored in `data/backups/`; doctor runs `PRAGMA integrity_check`.

