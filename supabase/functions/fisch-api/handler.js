const socialActions=new Set(['friend_request','friend_respond','friend_cancel','friend_remove','friends','requests','leaderboard','heartbeat']);
export function createApiHandler({verifyUser,game,social,allowedOrigins=[]}){
  return async request=>{
    const origin=request.headers.get('origin');
    const headers={'content-type':'application/json','cache-control':'no-store','vary':'Origin',
      'access-control-allow-origin':origin&&allowedOrigins.includes(origin)?origin:allowedOrigins.length?'null':'*',
      'access-control-allow-headers':'authorization, apikey, x-client-info, content-type','access-control-allow-methods':'POST, OPTIONS'};
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    const fail=(code,status)=>reply({ok:false,error:{code,message:code}},status);
    if(origin&&allowedOrigins.length&&!allowedOrigins.includes(origin))return fail('FORBIDDEN',403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return fail('INVALID_REQUEST',405);
    try{
      const authorization=request.headers.get('authorization');
      if(!authorization?.startsWith('Bearer '))return fail('AUTH_REQUIRED',401);
      const user=await verifyUser(authorization.slice(7));if(!user?.id)return fail('AUTH_REQUIRED',401);
      if(Number(request.headers.get('content-length')||0)>16384)return fail('INVALID_REQUEST',413);
      const text=await request.text();if(text.length>16384)return fail('INVALID_REQUEST',413);
      let body;try{body=JSON.parse(text);}catch{return fail('INVALID_REQUEST',400);}
      if(!body||typeof body.action!=='string')return fail('INVALID_REQUEST',400);
      const command={ownerId:user.id,action:body.action,operationId:body.operationId,payload:body.payload??{}};
      return reply(await (socialActions.has(body.action)?social:game)(command));
    }catch{return fail('SERVER_ERROR',500);}
  };
}
