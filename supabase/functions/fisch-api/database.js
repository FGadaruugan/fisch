const known=new Set(['CONFLICT_RETRY','OPERATION_CONFLICT','NOT_INITIALIZED','FRIEND_NOT_FOUND','SELF_REQUEST','FORBIDDEN','REQUEST_NOT_FOUND','REQUEST_CLOSED','ALREADY_FRIENDS','INVALID_DECISION','INVALID_METRIC','UNKNOWN_ACTION']);
export function createDatabase(client){
  async function checked(promise){const {data,error}=await promise;if(error){const message=error.message?.trim();throw Object.assign(new Error('Database command failed'),{code:known.has(message)?message:'SERVER_ERROR'});}return data;}
  return {
    bootstrap:(owner,initial)=>checked(client.rpc('fisch_bootstrap',{p_owner:owner,p_initial:initial})),
    read:owner=>checked(client.rpc('fisch_read_game',{p_owner:owner})),
    receipt:(owner,op)=>checked(client.from('fisch_operations').select('signature,result').eq('user_id',owner).eq('operation_id',op).maybeSingle()),
    commit:(owner,op,signature,revision,snapshot,result,ticket)=>checked(client.rpc('fisch_commit_state',{p_owner:owner,p_operation:op,p_signature:signature,p_revision:revision,p_snapshot:snapshot,p_result:result,p_ticket:ticket})),
    social:(owner,action,op,payload)=>checked(client.rpc('fisch_social_command',{p_owner:owner,p_action:action,p_operation:op,p_payload:payload})),
    heartbeat:owner=>checked(client.rpc('fisch_heartbeat',{p_owner:owner})),
    socialRead:(owner,kind,metric='xp')=>checked(client.rpc('fisch_social_read',{p_owner:owner,p_kind:kind,p_metric:metric}))
  };
}
