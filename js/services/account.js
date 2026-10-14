import {createClient} from '@supabase/supabase-js';
import {GameError} from '../errors.js';
export function createAccountClient(config,{callback=false}={}) {
  if(!config.url||!config.publishableKey)throw new GameError('ONLINE_UNAVAILABLE');
  return createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:callback,flowType:'implicit',storageKey:'fisch3d.online.auth.v1'}});
}
export async function verifiedAccount(client) {
  const stored=await client.auth.getSession();
  if(stored.error||!stored.data?.session)return null;
  const {data,error}=await client.auth.getUser();
  if(error)throw new GameError(error.status===401||error.status===403?'AUTH_REQUIRED':'NETWORK_ERROR');
  if(!data?.user?.id||data.user.id!==stored.data.session.user.id||data.user.is_anonymous||!data.user.email)throw new GameError('AUTH_REQUIRED');
  return data.user;
}
