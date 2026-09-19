# REST and Realtime Contract

All endpoints are under `/api/v1`; JSON responses use `{ok:true,data}` or
`{ok:false,error:{code,message,details?}}`. Mutations may carry an
`Idempotency-Key`. Pagination uses `limit` and `cursor`.

- `GET /setup/status`, `POST /setup/config`, `POST /setup/complete`
- `GET /system/snapshot`, `/system/health`, `/system/doctor`
- `GET /accounts`, `POST /accounts/google/credentials`, `/connect`, `/disconnect`
- `GET /accounts/google/callback` (loopback OAuth callback)
- `GET /storage`, `GET /local/browse`, `POST /local/scan`
- `GET /drive/files`, `POST /drive/folders`
- `POST /jobs/preflight`, `POST /jobs`, `GET /jobs`, `GET /jobs/:id`
- `POST /jobs/:id/pause|resume|retry|cancel`
- `GET /queue`, `POST /queue/pause|resume|retry-failed|clear-completed`
- `GET /history`, `/notifications`, `/metrics`
- `POST /notifications/:id/read`, `DELETE /notifications/read`
- `GET /settings`, `PATCH /settings`

WebSocket endpoint: `/ws`. Events use `{event,ts,data}`. Canonical names include
`system.status`, `network.changed`, `scan.*`, `job.*`, `file.*`, `queue.updated`,
`storage.updated`, `notification.created`, `metrics.updated`, and `drive.*`.
Events are hints: clients reconnect, fetch a snapshot, then reconcile.

