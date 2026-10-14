/** Cached ranks belong to one metric; a failed tab switch cannot relabel their values. */
export function prepareSocialRefresh(state,{metric=state.metric}={}){
  return {...state,metric,loading:true,error:null,leaderboard:metric===state.metric?state.leaderboard:null};
}
