# TermuDrive

TermuDrive is an open-source, local Android cloud upload and file-management
system powered by Termux. Its browser dashboard is a control panel; the durable
engine runs as a detached Node.js process, reads Android files directly and
uploads them to Google Drive with a SQLite-backed queue and resumable sessions.

> Status: v1 reference implementation. Test with non-critical files first. The
> project has automated tests, but Android lifecycle behavior and real Google
> OAuth/upload flows still require validation on your own device/account.

## Key features

- guided first-run checks, OAuth setup, account connection and initial scan;
- Android file browser and recursive folder jobs (Drive folder hierarchy kept);
- account-aware local ↔ Google Drive mappings, changed/missing/source checks;
- preflight, duplicate policies and local storage-capacity estimator;
- persistent SQLite queue, 1–10 workers, pause/resume/retry/cancel;
- Google Drive resumable sessions persisted after every acknowledged chunk;
- retry with jitter, network wait, startup recovery and graceful shutdown;
- real device/Drive quota, transfer metrics, notifications and health checks;
- responsive light/dark dashboard, REST v1, WebSocket and practical CLI;
- localhost binding, path allowlist, encrypted OAuth tokens and redacted logs.

## How it works

The UI sends paths and commands—not file bytes—to `127.0.0.1:8765`. The core
captures an immutable source manifest in SQLite. Workers claim individual file
rows transactionally, establish Google resumable-upload sessions, commit remote
offsets per chunk, verify the result, then update the account-specific mapping.
Closing the browser does not stop the daemon. See [ARCHITECTURE.md](ARCHITECTURE.md),
[DATABASE.md](DATABASE.md), [API.md](API.md) and [STATE_MACHINE.md](STATE_MACHINE.md).

## Requirements

- Android with the current Termux build (prefer F-Droid or GitHub, not the old
  Play Store build);
- Node.js 22.13 or newer, Git and approximately 100 MB free app storage;
- Android shared-storage permission;
- a Google Cloud project with Google Drive API and your own OAuth client;
- a modern Android browser.

TermuDrive intentionally uses Node's built-in SQLite so installation has no
native database compilation step. The only production dependency is `ws`.

## Install on Android / Termux

Run these commands in Termux. Replace the repository placeholder with the URL of
the GitHub repository where you publish this project.

```bash
pkg update && pkg upgrade
pkg install git nodejs
termux-setup-storage
git clone <TERMUDRIVE_REPOSITORY_URL> termudrive
cd termudrive
bash install.sh
termudrive doctor
termudrive start
```

Open the dashboard in Android's browser:

```text
http://127.0.0.1:8765
```

If `termudrive` is not found, restart Termux or invoke the installed launcher as
`$PREFIX/bin/termudrive`. The installer never edits your shell profile.

## Daily commands

```bash
termudrive start
termudrive status
termudrive doctor
termudrive logs
termudrive restart
termudrive stop
```

`start` launches a detached process and records `runtime/termudrive.pid`.
`stop` sends SIGTERM and waits for cooperative worker shutdown, session/DB
persistence and a WAL checkpoint. It will not force-kill a process that does not
stop safely.

## Google Cloud and OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Open **APIs & Services → Library**, find **Google Drive API**, and enable it.
4. Configure the OAuth consent screen. Add your Google account as a test user if
   the app remains in testing.
5. Open **Credentials → Create credentials → OAuth client ID** and choose
   **Desktop app** (installed application).
6. Copy the Client ID and Client Secret. Never commit them, paste them in a public
   issue, or share them in chat.
7. Start TermuDrive and open its onboarding page.
8. Enter the Client ID and Client Secret in the OAuth configuration step.
9. Choose **Connect Google Drive**, sign in and approve access.
10. Google returns to `http://127.0.0.1:8765/api/v1/accounts/google/callback`;
    TermuDrive verifies Drive access before showing the account as connected.

TermuDrive requests `https://www.googleapis.com/auth/drive`. V1 needs this scope
to browse existing Drive folders/files, verify mappings, create folders and
safely replace/remap user-selected files. Tokens and the client secret are
AES-256-GCM encrypted with a device-local key in `data/.secret-key`. Refresh
tokens never enter browser storage. Disconnect removes the stored account token.

## First-run onboarding

The dashboard remains behind onboarding until environment, storage, OAuth,
account, scan and defaults are handled. Run `termux-setup-storage` before the
storage step. The initial scan indexes actual files with a cheap path + size +
mtime fingerprint; dashboard counts are never demo fixtures. Scans run in the
backend and WebSocket events report progress.

## Uploading files and folders

In **File Manager**, browse a permitted root, select a file/folder, then choose
**New Upload**. Pick a Drive destination in **Google Drive**, analyze, review the
real quota/queue estimate and confirm. A folder becomes one job containing
independent file records. Its relative folder structure is created lazily in
Drive. The CLI equivalent is:

```bash
termudrive upload /storage/emulated/0/DCIM
termudrive upload /storage/emulated/0/Download/example.zip DRIVE_FOLDER_ID
```

The default duplicate policy is `SKIP_EXISTING`: only a verified mapping for the
same local file, account and captured fingerprint is skipped. `UPLOAD_ANYWAY`
creates a new remote file. `REPLACE_OR_REMAP` updates the mapped remote file when
one exists; otherwise it uploads normally. Filename alone is never proof of a
duplicate.

**Upload Missing** is achieved by filtering Not Uploaded files/folders in File
Manager and creating a folder job with `SKIP_EXISTING`; mapped files are skipped
inside the persistent manifest.

## Queue, background operation and recovery

```bash
termudrive queue
termudrive pause
termudrive resume
termudrive retry
```

Every job/file/session lives in SQLite. Pause is cooperative at chunk boundaries.
Network errors move work to `WAITING_NETWORK`; transient/rate-limit errors use
bounded exponential backoff with jitter. Permanent, authentication, full-storage
and source errors do not retry forever. On restart, abandoned claims return to a
recoverable state and Google sessions are probed for their authoritative offset.
Expired sessions start safely again; verified completed files are not blindly
requeued. Repeated job creation can be protected with `Idempotency-Key`.

Android may still kill Termux. TermuDrive cannot override Android lifecycle
policy; it is designed to recover after restart. In Android settings, exempt
Termux from battery optimization if appropriate. Optional Termux API users can
hold a wake lock while doing important work:

```bash
termux-wake-lock
# later, after uploads finish
termux-wake-unlock
```

Wake locks consume battery. TermuDrive does not enable one silently.

## File states

- `NOT_UPLOADED`: no verified mapping for this account.
- `QUEUED`, `PREPARING`, `UPLOADING`, `VERIFYING`: active lifecycle.
- `UPLOADED`: mapped and verified for the connected account.
- `CHANGED`: local fingerprint differs from the uploaded manifest.
- `MISSING_REMOTE`: mapped Drive file could not be verified.
- `SOURCE_CHANGED` / `SOURCE_MISSING`: source no longer matches its job manifest.
- `WAITING_NETWORK`, `RETRY_WAIT`, `PAUSED`, `FAILED`, `CANCELLED`: actionable
  queue states. Details and retry counts appear in the queue/notifications.

## Storage, metrics, notifications and health

Device values come from `statfs`; Drive quota comes from Drive `about`. Queue
capacity is an estimator, not a Google reservation. WebSocket publishes current
events while snapshot reconciliation prevents stale browser state. Raw metrics
are pruned after 24 hours; historical aggregate rows are eligible for 30-day
retention. Notifications persist until cleared. **System Status** covers Drive,
network, workers, database integrity, storage access, queue and engine.

## CLI reference

| Command | Purpose |
|---|---|
| `termudrive start` / `stop` / `restart` | Manage the background engine |
| `termudrive status` | PID, address and live health |
| `termudrive doctor` | Environment, storage, DB, queue, network, account |
| `termudrive upload <path> [folder-id]` | Preflight and create a job |
| `termudrive queue` | List jobs |
| `termudrive pause` / `resume` | Pause/resume all queued work |
| `termudrive retry` | Retry failed files |
| `termudrive account` | Show non-secret account status |
| `termudrive config` | Show safe runtime settings |
| `termudrive logs` | Show the last 100 structured log entries |

## Configuration and data

Safe settings are available in onboarding/Settings. Advanced environment values
may be copied from `.env.example` into the shell environment before starting.
The default bind is always `127.0.0.1`; do not change it to `0.0.0.0` unless you
understand the security consequences (a remote dashboard is out of scope).

| Path | Content |
|---|---|
| `data/termudrive.db` | SQLite state, manifests and sessions |
| `data/.secret-key` | local encryption key (mode 0600) |
| `data/backups/` | pre-migration database backups |
| `runtime/termudrive.pid` | running daemon PID |
| `logs/termudrive.log*` | redacted structured logs, rotated near 5 MB |

Back up while stopped:

```bash
termudrive stop
cp data/termudrive.db data/backups/manual-$(date +%Y%m%d-%H%M%S).db
termudrive start
```

Keep the matching `data/.secret-key`; without it stored OAuth data cannot be
decrypted. Do not publish either file.

## Safe updates

From the cloned repository:

```bash
cd termudrive
termudrive stop
git pull --ff-only
bash install.sh --update
termudrive doctor
termudrive start
```

`install.sh --update` preserves configuration/data, installs locked dependencies,
opens the database and applies migrations. Existing databases are copied into
`data/backups/` before a new schema migration.

## Troubleshooting

Start with `termudrive doctor`, then `termudrive logs`.

- **Command not found:** restart Termux or run `$PREFIX/bin/termudrive`.
- **Node incompatible:** `pkg upgrade && pkg install nodejs`; v22.13+ is required.
- **Storage unavailable / `/storage/emulated/0` denied:** run
  `termux-setup-storage`, grant Android permission and restart Termux.
- **Port 8765 in use:** stop the other service or set `TERMUDRIVE_PORT` before
  both installing/starting and configuring the OAuth callback.
- **Dashboard does not open:** verify `termudrive status`, use exactly
  `http://127.0.0.1:8765`, and keep Termux running.
- **OAuth failed / redirect problem:** use a Desktop app client, confirm the
  dashboard port, consent-screen test user and device time; reconnect.
- **Drive API not enabled:** enable it in the same Cloud project as the client.
- **Token expired:** reconnect from onboarding/account settings.
- **Drive full:** clear space or choose another connected account; failed
  full-storage work is not retried forever.
- **Waiting for network:** verify Android connectivity; work resumes after the
  backend detects Google connectivity.
- **Repeated retry:** inspect the file error and logs; check source readability,
  rate limits and account state.
- **Database integrity error:** stop the service, preserve `data/`, and restore a
  known-good file from `data/backups/`; never delete the only copy.
- **Stale PID:** `doctor` reports it; `start` safely replaces a dead PID file.
- **Android killed Termux:** reopen Termux and run `termudrive start`; queue and
  resumable sessions are recovered.
- **Queue restored after restart:** this is expected; completed/verified rows are
  retained and interrupted rows are reconciled.

## Security and privacy

The server binds to loopback, validates JSON and filenames, canonicalizes paths
below explicit roots, encrypts provider secrets/tokens, and redacts structured
logs. `.gitignore` excludes databases, credentials, tokens, runtime and logs.
The browser never receives refresh tokens or resumable session URIs. Google can
still see uploaded data and OAuth metadata under its terms. TermuDrive has no
telemetry and no remote management endpoint.

## Development and testing

```bash
npm install
npm run lint
npm test
TERMUDRIVE_FOREGROUND=1 npm start
```

Tests use temporary databases and fake/local fixtures; they do not need personal
Google credentials. A real Android device and Google account are required for the
final platform/OAuth/resumable-upload validation.

## Project structure

```text
src/core/          jobs, queue, workers, recovery, metrics, health
src/database/      SQLite migration and transaction layer
src/filesystem/    Android-safe browser and incremental scanner
src/providers/     provider contract and Google Drive implementation
src/server/        REST v1, WebSocket and static delivery
web/               responsive production control panel
cli/               process manager and API client
tests/             unit and integration tests
data runtime logs  ignored persistent/runtime directories
```

## Contributing, roadmap and license

See [CONTRIBUTING.md](CONTRIBUTING.md). V1 intentionally excludes two-way sync,
Drive-to-Android sync, public dashboards, scheduling and non-Google providers.
Future provider adapters may add OneDrive, Dropbox, S3 or WebDAV without changing
the core contract. Licensed under the [MIT License](LICENSE).
