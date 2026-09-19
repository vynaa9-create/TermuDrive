# State Machine

Canonical states live in `src/contracts.js`.

Job states: `QUEUED`, `RUNNING`, `PAUSED`, `WAITING_NETWORK`, `COMPLETED`,
`PARTIALLY_FAILED`, `FAILED`, `CANCELLED`.

File states: `NOT_UPLOADED`, `QUEUED`, `PREPARING`, `UPLOADING`, `VERIFYING`,
`UPLOADED`, `CHANGED`, `WAITING_NETWORK`, `RETRY_WAIT`, `FAILED`,
`SOURCE_CHANGED`, `SOURCE_MISSING`, `MISSING_REMOTE`, `PAUSED`, `CANCELLED`.

Normal transition:

`QUEUED -> PREPARING -> UPLOADING -> VERIFYING -> UPLOADED`

Recovery transition:

`UPLOADING -> WAITING_NETWORK/RETRY_WAIT -> PREPARING -> UPLOADING`.

Terminal states are `UPLOADED`, `SOURCE_CHANGED`, `SOURCE_MISSING`, `FAILED`, and
`CANCELLED`; explicit retry may move recoverable terminal states to `QUEUED`.
Pause is cooperative at chunk boundaries. Cancellation deletes no source or
remote file. Invalid transitions are rejected centrally.

