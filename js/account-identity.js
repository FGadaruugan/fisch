import {GameError} from './errors.js';
/** Every awaited continuation belongs to a specific observed Auth identity generation. */
export function createIdentityGuard(){
  let owner=null,generation=0;
  const valid=ticket=>!!ticket&&ticket.owner===owner&&ticket.generation===generation;
  const assert=ticket=>{if(!valid(ticket))throw new GameError('AUTH_REQUIRED');};
  return{
    observe(id){const changed=id!==owner;if(changed){owner=id;generation++;}return changed;},
    capture(id){if(!id||id!==owner)throw new GameError('AUTH_REQUIRED');return {owner:id,generation};},
    valid,assert,
    async run(ticket,work,onStale=()=>{}){assert(ticket);const value=await work();if(!valid(ticket)){onStale(value);throw new GameError('AUTH_REQUIRED');}return value;}
  };
}
