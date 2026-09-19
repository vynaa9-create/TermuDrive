import {db,now} from '../database/index.js'; import {emit} from '../events.js'; import {Events,Severity} from '../contracts.js';
export function notify(type,title,message,severity=Severity.INFO,entityType=null,entityId=null){const r=db().prepare(`INSERT INTO notifications(type,severity,title,message,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?,?)`).run(type,severity,title,message,entityType,entityId,now());const item={id:Number(r.lastInsertRowid),type,severity,title,message,entityType,entityId,createdAt:now()};emit(Events.NOTIFICATION_CREATED,item);return item;}
export function history(kind,entityId,message,metadata={}){db().prepare('INSERT INTO history(kind,entity_id,message,metadata_json,created_at) VALUES(?,?,?,?,?)').run(kind,entityId,message,JSON.stringify(metadata),now());}

