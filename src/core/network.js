import {emit} from '../events.js';import {Events,Severity} from '../contracts.js';import {metric} from './metrics.js';import {notify} from './notifications.js';
let online=true,timer;
export function isOnline(){return online;}
export async function checkNetwork(){let next=false;try{const r=await fetch('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',{method:'HEAD',signal:AbortSignal.timeout(5000)});next=r.status<500;}catch{}if(next!==online){online=next;metric('network_state',online?1:0);emit(Events.NETWORK_CHANGED,{online});notify(online?'NETWORK_RESTORED':'NETWORK_LOST',online?'Network restored':'Network unavailable',online?'Waiting uploads can resume.':'Uploads will wait safely until connectivity returns.',online?Severity.SUCCESS:Severity.WARNING);}return online;}
export function startNetworkMonitor(){checkNetwork();timer=setInterval(checkNetwork,15000);timer.unref();}
export function stopNetworkMonitor(){clearInterval(timer);}
