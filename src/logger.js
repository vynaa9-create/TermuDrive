import fs from 'node:fs';
import {config,ensureDirs} from './config.js';
ensureDirs();
const rank={DEBUG:10,INFO:20,WARN:30,ERROR:40};
const redact=/((?:access|refresh|client)[_-]?(?:token|secret)|authorization_code|authorization)"?\s*[:=]\s*"?([^"\s,}]+)/ig;
function clean(value){return String(value instanceof Error?(value.stack||value.message):value).replace(redact,'$1=[REDACTED]');}
function rotate(){try{const s=fs.statSync(config.logPath);if(s.size>5*1024*1024){for(let i=2;i>=1;i--){const a=`${config.logPath}.${i}`,b=`${config.logPath}.${i+1}`;if(fs.existsSync(a))fs.renameSync(a,b);}fs.renameSync(config.logPath,`${config.logPath}.1`);}}catch{}}
export function log(level,message,meta={}){level=level.toUpperCase();if((rank[level]||20)<(rank[config.logLevel]||20))return;const entry=JSON.stringify({ts:new Date().toISOString(),level,message:clean(message),...Object.fromEntries(Object.entries(meta).map(([k,v])=>[k,/secret|token|code/i.test(k)?'[REDACTED]':clean(v)]))});rotate();fs.appendFileSync(config.logPath,entry+'\n',{mode:0o600});if(process.env.TERMUDRIVE_FOREGROUND==='1')console.log(entry);}

