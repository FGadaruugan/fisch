import {GameError} from './errors.js';
/** An OAuth error or stale persisted identity must never count as this login's result. */
export function sessionForOAuthReturn(hash,session){
  const params=new URLSearchParams(hash.replace(/^#/,''));
  if(params.has('error'))throw new GameError('AUTH_FAILED');
  if(!params.has('access_token')&&!params.has('refresh_token'))return null;
  const access=params.get('access_token'),refresh=params.get('refresh_token');
  if(!access||!refresh||session?.access_token!==access||session?.refresh_token!==refresh)throw new GameError('AUTH_FAILED');
  return {access_token:access,refresh_token:refresh};
}
