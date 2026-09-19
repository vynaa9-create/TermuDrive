export const version=1;
export const name='initial';
export const sql=`
CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY,provider TEXT NOT NULL,provider_account_id TEXT,email TEXT,display_name TEXT,status TEXT NOT NULL DEFAULT 'DISCONNECTED',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(provider,provider_account_id));
CREATE TABLE IF NOT EXISTS oauth_credentials(id INTEGER PRIMARY KEY,provider TEXT NOT NULL UNIQUE,client_id TEXT NOT NULL,client_secret_enc TEXT NOT NULL,redirect_uri TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS account_tokens(account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,token_enc TEXT NOT NULL,expires_at TEXT,scope TEXT,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS local_files(id INTEGER PRIMARY KEY,canonical_path TEXT NOT NULL UNIQUE,name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,mtime_ms INTEGER NOT NULL,fingerprint TEXT NOT NULL,sha256 TEXT,last_seen_at TEXT NOT NULL,missing INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_local_seen ON local_files(last_seen_at); CREATE INDEX IF NOT EXISTS idx_local_fp ON local_files(size,mtime_ms);
CREATE TABLE IF NOT EXISTS remote_files(id INTEGER PRIMARY KEY,account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,drive_file_id TEXT NOT NULL,name TEXT,size INTEGER,md5_checksum TEXT,mime_type TEXT,parent_id TEXT,trashed INTEGER NOT NULL DEFAULT 0,modified_time TEXT,last_seen_at TEXT,metadata_json TEXT,UNIQUE(account_id,drive_file_id));
CREATE INDEX IF NOT EXISTS idx_remote_parent ON remote_files(account_id,parent_id);
CREATE TABLE IF NOT EXISTS file_mappings(id INTEGER PRIMARY KEY,local_file_id INTEGER NOT NULL REFERENCES local_files(id) ON DELETE CASCADE,account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,remote_file_id INTEGER REFERENCES remote_files(id) ON DELETE SET NULL,uploaded_size INTEGER,uploaded_mtime_ms INTEGER,uploaded_fingerprint TEXT,uploaded_at TEXT,last_verified_at TEXT,verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',UNIQUE(local_file_id,account_id));
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,account_id INTEGER NOT NULL REFERENCES accounts(id),source_path TEXT NOT NULL,destination_id TEXT NOT NULL,destination_name TEXT,state TEXT NOT NULL,duplicate_policy TEXT NOT NULL,worker_count INTEGER NOT NULL,total_files INTEGER NOT NULL DEFAULT 0,total_bytes INTEGER NOT NULL DEFAULT 0,completed_files INTEGER NOT NULL DEFAULT 0,completed_bytes INTEGER NOT NULL DEFAULT 0,failed_files INTEGER NOT NULL DEFAULT 0,idempotency_key TEXT UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,started_at TEXT,completed_at TEXT,error TEXT);
CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state,created_at);
CREATE TABLE IF NOT EXISTS job_files(id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,local_file_id INTEGER REFERENCES local_files(id),source_path TEXT NOT NULL,relative_path TEXT NOT NULL,destination_parent_id TEXT,state TEXT NOT NULL,size INTEGER NOT NULL,mtime_ms INTEGER NOT NULL,fingerprint TEXT NOT NULL,remote_file_id TEXT,uploaded_bytes INTEGER NOT NULL DEFAULT 0,retry_count INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT,error_class TEXT,error_message TEXT,claim_token TEXT,claimed_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(job_id,source_path));
CREATE INDEX IF NOT EXISTS idx_job_files_claim ON job_files(state,next_attempt_at,claimed_at); CREATE INDEX IF NOT EXISTS idx_job_files_job ON job_files(job_id,state);
CREATE TABLE IF NOT EXISTS upload_sessions(job_file_id TEXT PRIMARY KEY REFERENCES job_files(id) ON DELETE CASCADE,provider TEXT NOT NULL,session_uri TEXT NOT NULL,uploaded_bytes INTEGER NOT NULL,total_bytes INTEGER NOT NULL,remote_file_id TEXT,last_activity TEXT NOT NULL,retry_count INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,entity_id TEXT,message TEXT,metadata_json TEXT,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY,type TEXT NOT NULL,severity TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,entity_type TEXT,entity_id TEXT,is_read INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read,created_at DESC);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value_json TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS metrics(id INTEGER PRIMARY KEY,name TEXT NOT NULL,value REAL NOT NULL,tags_json TEXT,granularity TEXT NOT NULL DEFAULT 'raw',recorded_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON metrics(name,recorded_at);
CREATE TABLE IF NOT EXISTS idempotency_keys(key TEXT PRIMARY KEY,response_json TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL);
`;

