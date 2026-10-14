import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createDatabase} from './database.js';
import {runGameCommand} from './commands.js';
import {runSocialCommand} from './social-rules.js';
import {createApiHandler} from './handler.js';

const url=Deno.env.get('SUPABASE_URL')!;
// Provided by the Edge runtime. This key is never part of browser config or dist/.
const serverKey=Deno.env.get('FISCH_SERVICE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const client=createClient(url,serverKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const database=createDatabase(client);
Deno.serve(createApiHandler({
  verifyUser:async(token:string)=>{const {data,error}=await client.auth.getUser(token);return error?null:data.user;},
  game:command=>runGameCommand(command,{database}),
  social:command=>runSocialCommand(command,{database}),
  allowedOrigins:(Deno.env.get('FISCH_ALLOWED_ORIGINS')||'https://fgadaruugan.github.io,https://fisch-tides.hulanganbaatar834.chatgpt.site').split(',').map(s=>s.trim()).filter(Boolean)
}));
