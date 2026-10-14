import {GameError} from '../errors.js';
import {operationId} from './local.js';
export function clientTransport(client){
  return async command=>{
    const {data,error}=await client.functions.invoke('fisch-api',{body:command});
    if(error){
      let code=error.context?.status===401?'AUTH_REQUIRED':'NETWORK_ERROR';
      try{const body=await error.context?.json();if(body?.error?.code)code=body.error.code;}catch{}
      throw new GameError(code);
    }
    return data;
  };
}
/** Reuse an ID through automatic retries and a later deliberate retry of an unconfirmed command. */
export function createRetryTransport(transport,{delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),retries=2}={}){
  const pending=new Map();
  async function request(action,payload={},id){
    const key=JSON.stringify({action,payload,id:id||null});
    let entry=pending.get(key);if(entry?.promise)return entry.promise;
    if(!entry){entry={id:id||operationId(),promise:null};pending.set(key,entry);}
    const command={action,payload,operationId:entry.id};
    entry.promise=(async()=>{
      for(let attempt=0;attempt<=retries;attempt++){
        try{
          const result=await transport(command);
          if(!result?.ok)throw new GameError(result?.error?.code||'PROTOCOL_ERROR');
          pending.delete(key);return result;
        }catch(error){
          const code=error?.code||'NETWORK_ERROR';
          const retryable=['NETWORK_ERROR','SERVER_ERROR','CONFLICT_RETRY'].includes(code);
          if(!retryable){pending.delete(key);throw new GameError(code);}
          if(attempt===retries){entry.promise=null;throw new GameError(code);}
          await delay(250*2**attempt);
        }
      }
    })();return entry.promise;
  }
  return {request,dispose(){pending.clear();}};
}
