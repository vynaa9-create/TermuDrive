import {EventEmitter} from 'node:events';
export const events=new EventEmitter(); events.setMaxListeners(100);
export function emit(event,data={}){events.emit('event',{event,ts:new Date().toISOString(),data});}

