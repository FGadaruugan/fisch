import {GameError} from '../errors.js';
import {operationId} from './local.js';
export function clientTransport(client,{ownerId}={}){
  return async(command,{signal}={})=>{
    let headers;
    if(ownerId){
      const {data,error}=await client.auth.getSession();
      if(error||data?.session?.user?.id!==ownerId||!data.session.access_token)throw new GameError('AUTH_REQUIRED');
      headers={Authorization:'Bearer '+data.session.access_token,'x-fisch-owner':ownerId};
    }
    const {data,error}=await client.functions.invoke('fisch-api',{body:command,headers,signal});
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
  const pending=new Map();let disposed=false;
  async function request(action,payload={},id){
    if(disposed)throw new GameError('AUTH_REQUIRED');
    const key=JSON.stringify({action,payload,id:id||null});
    let entry=pending.get(key);if(entry?.promise)return entry.promise;
    if(!entry){entry={id:id||operationId(),promise:null,controller:new AbortController()};pending.set(key,entry);}
    const command={action,payload,operationId:entry.id};
    entry.promise=(async()=>{
      for(let attempt=0;attempt<=retries;attempt++){
        try{
          if(disposed)throw new GameError('AUTH_REQUIRED');
          const result=await transport(command,{signal:entry.controller.signal});
          if(disposed)throw new GameError('AUTH_REQUIRED');
          if(!result?.ok)throw new GameError(result?.error?.code||'PROTOCOL_ERROR');
          pending.delete(key);return result;
        }catch(error){
          if(disposed)throw new GameError('AUTH_REQUIRED');
          const code=error?.code||'NETWORK_ERROR';
          const retryable=['NETWORK_ERROR','SERVER_ERROR','CONFLICT_RETRY'].includes(code);
          if(!retryable){pending.delete(key);throw new GameError(code);}
          if(attempt===retries){entry.promise=null;throw new GameError(code);}
          await delay(250*2**attempt);
        }
      }
    })();return entry.promise;
  }
  return {request,dispose(){disposed=true;for(const entry of pending.values())entry.controller.abort();pending.clear();}};
}
