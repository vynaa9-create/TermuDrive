# TermuDrive v1 Architecture

## Laws

1. The frontend controls; the backend executes.
2. The UI never owns work.
3. Browser closure never stops a job.
4. Durable state is committed before it is reported.
5. Local/remote mappings are scoped to an account.
6. Important backend conditions are observable through snapshots and events.

## Runtime

`termudrive start` launches a detached Node process bound to `127.0.0.1:8765`.
The HTTP server serves a static, mobile-first UI plus `/api/v1`. WebSocket clients
receive hints and always reconcile with a fresh `/api/v1/system/snapshot` after
connecting. SQLite is authoritative. The worker pool claims rows transactionally;
the browser never reads file bytes and never talks to Google directly.

```text
Browser UI -> REST/WebSocket -> Core -> SQLite queue -> Workers -> CloudProvider
                                  |                       -> Google Drive
                                  +-> Android filesystem
```

## Components

- `src/database`: migrations, transactions, repositories, integrity and backup.
- `src/filesystem`: safe roots, browsing, incremental scan and fingerprints.
- `src/providers`: provider interface and Google Drive OAuth/REST/resumable API.
- `src/core`: state machine, preflight, jobs, queue, workers, recovery, metrics,
  notifications, network and health.
- `src/server`: versioned REST, static UI and WebSocket event fan-out.
- `cli`: process manager and API client controlling the same engine.
- `web`: production UI; all values originate from backend snapshots.

## Trust boundaries

The server is loopback-only by default. Paths must resolve below configured
storage roots. OAuth secrets/tokens are backend-only and redacted from logs/API.
Mutations accept an `Idempotency-Key`; job creation additionally stores a unique
idempotency key. Provider implementations receive validated canonical paths.

## Recovery

Startup migrates and checks SQLite, turns abandoned claims into recoverable queue
items, validates upload sessions lazily with Google, and resumes eligible work.
Shutdown stops claims, aborts at chunk boundaries, persists offsets, checkpoints
WAL, closes sockets/database and removes the PID file.

