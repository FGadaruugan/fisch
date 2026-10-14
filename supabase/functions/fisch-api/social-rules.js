import {GameError,levelForXp} from './shared-game.js';
export function validateFriendAction({callerId,request,membership},action){
  if(action==='friend_request'){if(request?.senderId===request?.recipientId)throw new GameError('SELF_REQUEST');return;}
  if(action==='friend_remove'){if(!membership||![membership.leftId,membership.rightId].includes(callerId))throw new GameError('FORBIDDEN');return;}
  if(!request)throw new GameError('REQUEST_NOT_FOUND');
  if((action==='friend_respond'&&callerId!==request.recipientId)||(action==='friend_cancel'&&callerId!==request.senderId))throw new GameError('FORBIDDEN');
  if(!['friend_respond','friend_cancel'].includes(action))throw new GameError('UNKNOWN_ACTION');
  if(request.status!=='pending')throw new GameError('REQUEST_CLOSED');
}
export function isOnline(lastSeen,now=Date.now()){
  const time=typeof lastSeen==='number'?lastSeen:Date.parse(lastSeen);return Number.isFinite(time)&&time>now-90000;
}
const metrics=new Map([['xp','totalXp'],['catches','totalCaught'],['weight','bestGrams']]);
export function rankScores(scores,metric,callerId){
  if(!metrics.has(metric))throw new GameError('INVALID_METRIC');const key=metrics.get(metric);
  const rows=[...scores].sort((a,b)=>b[key]-a[key]||(a.id<b.id?-1:a.id>b.id?1:0)).map((s,index)=>({id:s.id,name:s.name,avatar:s.avatar,level:levelForXp(s.totalXp),rank:index+1,value:s[key]}));
  return {entries:rows.slice(0,30),self:rows.find(row=>row.id===callerId)||null};
}
const fields=new Map([['friend_request',['friendCode']],['friend_respond',['requestId','decision']],['friend_cancel',['requestId']],['friend_remove',['friendId']],['friends',[]],['requests',[]],['leaderboard',['metric']],['heartbeat',[]]]);
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function runSocialCommand({ownerId,action,operationId,payload={}},{database}){
  try{
    if(!ownerId)throw new GameError('AUTH_REQUIRED');
    if(!fields.has(action))throw new GameError('UNKNOWN_ACTION');
    if(typeof operationId!=='string'||!/^[\w-]{1,64}$/.test(operationId)||!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).some(key=>!fields.get(action).includes(key)))throw new GameError('INVALID_REQUEST');
    let result;
    if(action==='heartbeat')result=await database.heartbeat(ownerId);
    else if(['friends','requests','leaderboard'].includes(action)){
      const metric=payload.metric??'xp';if(!metrics.has(metric))throw new GameError('INVALID_METRIC');result=await database.socialRead(ownerId,action,metric);
    }else{
      payload={...payload};
      if(action==='friend_request'){
        const code=typeof payload.friendCode==='string'?payload.friendCode.trim().toUpperCase():'';
        if(!/^[A-F0-9]{12}$/.test(code))throw new GameError('INVALID_FRIEND_CODE');payload.friendCode=code;
      }
      if(action==='friend_respond'&&!['accept','decline'].includes(payload.decision))throw new GameError('INVALID_DECISION');
      if(['friend_respond','friend_cancel'].includes(action)&&!uuid(payload.requestId))throw new GameError('INVALID_REQUEST');
      if(action==='friend_remove'&&!uuid(payload.friendId))throw new GameError('INVALID_REQUEST');
      result=await database.social(ownerId,action,operationId,payload);
    }
    return {ok:true,result};
  }catch(error){return {ok:false,error:{code:error.code||'SERVER_ERROR',message:error.code||'SERVER_ERROR'}};}
}
