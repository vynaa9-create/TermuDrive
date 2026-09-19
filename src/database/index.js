import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs'; import path from 'node:path';
import {config,ensureDirs} from '../config.js'; import {log} from '../logger.js';
import * as m1 from './migrations/001_initial.js';

let singleton;
function now(){return new Date().toISOString();}
export function openDatabase(dbPath=config.dbPath){
  if(singleton&&dbPath===config.dbPath)return singleton; ensureDirs();
  const existed=fs.existsSync(dbPath); const db=new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL)');
  const current=db.prepare('SELECT COALESCE(MAX(version),0) v FROM schema_migrations').get().v;
  for(const m of [m1]) if(m.version>current){
    if(existed){const dir=path.join(path.dirname(dbPath),'backups');fs.mkdirSync(dir,{recursive:true});const out=path.join(dir,`pre-migration-v${m.version}-${Date.now()}.db`);db.exec(`VACUUM INTO '${out.replaceAll("'","''")}'`);}
    db.exec('BEGIN IMMEDIATE');try{db.exec(m.sql);db.prepare('INSERT INTO schema_migrations VALUES(?,?,?)').run(m.version,m.name,now());db.exec('COMMIT');log('INFO','migration applied',{version:m.version});}catch(e){db.exec('ROLLBACK');throw e;}
  }
  if(dbPath===config.dbPath)singleton=db; return db;
}
export function db(){return openDatabase();}
export function transaction(fn){const d=db();d.exec('BEGIN IMMEDIATE');try{const r=fn(d);d.exec('COMMIT');return r;}catch(e){d.exec('ROLLBACK');throw e;}}
export function setting(key,fallback=null){const r=db().prepare('SELECT value_json FROM settings WHERE key=?').get(key);return r?JSON.parse(r.value_json):fallback;}
export function setSetting(key,value){db().prepare(`INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).run(key,JSON.stringify(value),now());}
export function integrity(){return db().prepare('PRAGMA integrity_check').all().map(x=>Object.values(x)[0]);}
export function closeDatabase(){if(singleton){try{singleton.exec('PRAGMA wal_checkpoint(TRUNCATE)')}catch{}singleton.close();singleton=null;}}
export {now};

