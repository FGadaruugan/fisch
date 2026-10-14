import {createRetryTransport,clientTransport} from './transport.js';
import {GameError} from '../errors.js';
export function createSocialService(clientOrOptions,config={}){
  const options=clientOrOptions?.transport||clientOrOptions?.client?clientOrOptions:{client:clientOrOptions,config};
  const rpc=createRetryTransport(options.transport||clientTransport(options.client,{ownerId:options.ownerId||options.config?.ownerId}),{delay:options.delay});
  const call=async(action,payload={},id)=>(await rpc.request(action,payload,id)).result;
  return {
    listFriends:()=>call('friends'),listRequests:()=>call('requests'),
    sendRequest:(friendCode,id)=>call('friend_request',{friendCode:friendCode.trim().toUpperCase()},id),
    respondRequest:(requestId,decision,id)=>call('friend_respond',{requestId,decision},id),
    cancelRequest:(requestId,id)=>call('friend_cancel',{requestId},id),
    removeFriend:(friendId,id)=>call('friend_remove',{friendId},id),
    heartbeat:()=>call('heartbeat'),
    getLeaderboard(metric){if(!['xp','catches','weight'].includes(metric))return Promise.reject(new GameError('INVALID_METRIC'));return call('leaderboard',{metric});},
    dispose(){rpc.dispose();}
  };
}
