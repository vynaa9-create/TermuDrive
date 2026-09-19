import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function int(name,fallback,min,max){const v=Number(process.env[name]??fallback);return Number.isInteger(v)&&v>=min&&v<=max?v:fallback;}
export const config = Object.freeze({
  root, host:process.env.TERMUDRIVE_HOST||'127.0.0.1', port:int('TERMUDRIVE_PORT',8765,1024,65535),
  workers:int('TERMUDRIVE_WORKERS',3,1,10), maxRetries:int('TERMUDRIVE_MAX_RETRIES',10,0,50),
  chunkSize:int('TERMUDRIVE_CHUNK_SIZE',8*1024*1024,256*1024,64*1024*1024),
  dataDir:path.join(root,'data'),runtimeDir:path.join(root,'runtime'),logsDir:path.join(root,'logs'),webDir:path.join(root,'web'),
  dbPath:process.env.TERMUDRIVE_DB||path.join(root,'data','termudrive.db'),
  pidPath:path.join(root,'runtime','termudrive.pid'), logPath:path.join(root,'logs','termudrive.log'),
  logLevel:(process.env.TERMUDRIVE_LOG_LEVEL||'INFO').toUpperCase(),
  storageRoots:(process.env.TERMUDRIVE_STORAGE_ROOTS||'/storage/emulated/0,'+path.join(os.homedir(),'storage')).split(',').map(x=>path.resolve(x.trim())).filter(Boolean)
});
export function ensureDirs(){for(const dir of [config.dataDir,config.runtimeDir,config.logsDir,path.join(config.dataDir,'backups')])fs.mkdirSync(dir,{recursive:true,mode:0o700});}

