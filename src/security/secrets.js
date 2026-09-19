import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
import {config,ensureDirs} from '../config.js';
const keyPath=path.join(config.dataDir,'.secret-key');
function key(){ensureDirs();if(!fs.existsSync(keyPath))fs.writeFileSync(keyPath,crypto.randomBytes(32),{mode:0o600});return fs.readFileSync(keyPath);}
export function encrypt(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv),body=Buffer.concat([c.update(String(value)),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64url');}
export function decrypt(value){const b=Buffer.from(value,'base64url'),d=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString();}

