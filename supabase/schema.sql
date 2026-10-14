-- Fisch server contract. Apply to the dedicated game project with a database owner.
-- Client roles can read permitted rows; every mutation goes through the verified Edge API.
begin;

create table public.fisch_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  avatar smallint not null check (avatar between 0 and 5),
  friend_code text not null unique check (friend_code ~ '^[A-F0-9]{12}$'),
  created_at timestamptz not null default now()
);
create table public.fisch_state (
  user_id uuid primary key references public.fisch_profiles(user_id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object' and (snapshot->>'version')::int=1
    and (snapshot->>'coins')::bigint between 0 and 1000000000
    and (snapshot->>'totalXp')::bigint between 0 and 1000000000
    and jsonb_array_length(snapshot->'fish')<=100),
  revision bigint not null default 0 check (revision>=0),
  updated_at timestamptz not null default now()
);
create table public.fisch_scores (
  user_id uuid primary key references public.fisch_profiles(user_id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp between 0 and 1000000000),
  total_caught bigint not null default 0 check (total_caught between 0 and 1000000000),
  best_grams int not null default 0 check (best_grams between 0 and 1000000),
  best_species text
);
create index fisch_scores_xp on public.fisch_scores(total_xp desc,user_id);
create index fisch_scores_catches on public.fisch_scores(total_caught desc,user_id);
create index fisch_scores_weight on public.fisch_scores(best_grams desc,user_id);
create table public.fisch_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.fisch_profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.fisch_profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id<>recipient_id)
);
create unique index fisch_requests_pending_pair on public.fisch_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id)) where status='pending';
create index fisch_requests_incoming on public.fisch_requests(recipient_id,created_at desc) where status='pending';
create index fisch_requests_outgoing on public.fisch_requests(sender_id,created_at desc) where status='pending';
create table public.fisch_friendships (
  left_id uuid not null references public.fisch_profiles(user_id) on delete cascade,
  right_id uuid not null references public.fisch_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(left_id,right_id), check (left_id<right_id)
);
create index fisch_friendships_right on public.fisch_friendships(right_id);
create table public.fisch_presence (
  user_id uuid primary key references public.fisch_profiles(user_id) on delete cascade,
  last_seen timestamptz not null default now()
);
create table public.fisch_sessions (
  user_id uuid primary key references public.fisch_profiles(user_id) on delete cascade,
  ticket jsonb not null,
  expires_at timestamptz not null default now()+interval '2 minutes'
);
create table public.fisch_operations (
  user_id uuid not null references public.fisch_profiles(user_id) on delete cascade,
  operation_id text not null check (operation_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  signature text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key(user_id,operation_id)
);

alter table public.fisch_profiles enable row level security;
alter table public.fisch_state enable row level security;
alter table public.fisch_scores enable row level security;
alter table public.fisch_requests enable row level security;
alter table public.fisch_friendships enable row level security;
alter table public.fisch_presence enable row level security;
alter table public.fisch_sessions enable row level security;
alter table public.fisch_operations enable row level security;
create policy fisch_public_profiles on public.fisch_profiles for select to authenticated using (true);
create policy fisch_owned_state on public.fisch_state for select to authenticated using ((select auth.uid())=user_id);
create policy fisch_public_scores on public.fisch_scores for select to authenticated using (true);
create policy fisch_request_participants on public.fisch_requests for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
create policy fisch_friend_participants on public.fisch_friendships for select to authenticated using ((select auth.uid()) in (left_id,right_id));
create policy fisch_friend_presence on public.fisch_presence for select to authenticated using (
  user_id=(select auth.uid()) or exists(select 1 from public.fisch_friendships f where
    (f.left_id=(select auth.uid()) and f.right_id=user_id) or (f.right_id=(select auth.uid()) and f.left_id=user_id))
);
-- No client policies or grants for cast tickets and operation receipts.
revoke all on public.fisch_profiles,public.fisch_state,public.fisch_scores,public.fisch_requests,public.fisch_friendships,public.fisch_presence,public.fisch_sessions,public.fisch_operations from public,anon,authenticated;
grant usage on schema public to authenticated,service_role;
grant select on public.fisch_profiles,public.fisch_state,public.fisch_scores,public.fisch_requests,public.fisch_friendships,public.fisch_presence to authenticated;
grant all on public.fisch_profiles,public.fisch_state,public.fisch_scores,public.fisch_requests,public.fisch_friendships,public.fisch_presence,public.fisch_sessions,public.fisch_operations to service_role;

create function public.fisch_read_game(p_owner uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select jsonb_build_object('snapshot',s.snapshot,'revision',s.revision,'friendCode',p.friend_code,
    'ticket',case when t.expires_at>now() then t.ticket else null end)
  from public.fisch_state s join public.fisch_profiles p using(user_id)
  left join public.fisch_sessions t using(user_id) where s.user_id=p_owner
$$;

create function public.fisch_bootstrap(p_owner uuid,p_initial jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
  insert into public.fisch_profiles(user_id,name,avatar,friend_code)
    values(p_owner,p_initial->'profile'->>'name',(p_initial->'profile'->>'avatar')::smallint,upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)))
    on conflict(user_id) do nothing;
  insert into public.fisch_state(user_id,snapshot) values(p_owner,p_initial) on conflict(user_id) do nothing;
  insert into public.fisch_scores(user_id) values(p_owner) on conflict(user_id) do nothing;
  return public.fisch_read_game(p_owner);
end $$;

-- Row lock + revision prevents two tabs from spending/awarding against the same old state.
-- Receipts are checked inside the same transaction as state, ticket and ranking changes.
create function public.fisch_commit_state(p_owner uuid,p_operation text,p_signature text,p_revision bigint,p_snapshot jsonb,p_result jsonb,p_ticket jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare current_state public.fisch_state; receipt public.fisch_operations;
begin
  select * into current_state from public.fisch_state where user_id=p_owner for update;
  if not found then raise exception 'NOT_INITIALIZED'; end if;
  select * into receipt from public.fisch_operations where user_id=p_owner and operation_id=p_operation;
  if found then
    if receipt.signature<>p_signature then raise exception 'OPERATION_CONFLICT'; end if;
    return public.fisch_read_game(p_owner)||jsonb_build_object('ok',true,'result',receipt.result);
  end if;
  if current_state.revision<>p_revision then raise exception 'CONFLICT_RETRY'; end if;
  update public.fisch_state set snapshot=p_snapshot,revision=revision+1,updated_at=now() where user_id=p_owner;
  update public.fisch_profiles set name=p_snapshot->'profile'->>'name',avatar=(p_snapshot->'profile'->>'avatar')::smallint where user_id=p_owner;
  update public.fisch_scores set total_xp=(p_snapshot->>'totalXp')::bigint,
    total_caught=(p_snapshot->'stats'->>'totalCaught')::bigint,
    best_grams=coalesce((p_snapshot->'stats'->'bestCatch'->>'weightGrams')::int,0),
    best_species=p_snapshot->'stats'->'bestCatch'->>'speciesId' where user_id=p_owner;
  if p_ticket is null or p_ticket='null'::jsonb then delete from public.fisch_sessions where user_id=p_owner;
  else insert into public.fisch_sessions(user_id,ticket,expires_at) values(p_owner,p_ticket,now()+interval '2 minutes')
    on conflict(user_id) do update set ticket=excluded.ticket,expires_at=excluded.expires_at;
  end if;
  insert into public.fisch_operations(user_id,operation_id,signature,result) values(p_owner,p_operation,p_signature,p_result);
  return public.fisch_read_game(p_owner)||jsonb_build_object('ok',true,'result',p_result);
end $$;

create function public.fisch_social_command(p_owner uuid,p_action text,p_operation text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare receipt public.fisch_operations; request public.fisch_requests; other_id uuid; v_left uuid; v_right uuid;
  v_signature text:=p_action||':'||p_payload::text; answer jsonb;
begin
  perform 1 from public.fisch_state where user_id=p_owner for update;
  if not found then raise exception 'NOT_INITIALIZED'; end if;
  select * into receipt from public.fisch_operations where user_id=p_owner and operation_id=p_operation;
  if found then
    if receipt.signature<>v_signature then raise exception 'OPERATION_CONFLICT'; end if;
    return receipt.result;
  end if;
  if p_action='friend_request' then
    select user_id into other_id from public.fisch_profiles where friend_code=upper(trim(p_payload->>'friendCode'));
    if not found then raise exception 'FRIEND_NOT_FOUND'; end if;
    if other_id=p_owner then raise exception 'SELF_REQUEST'; end if;
  elsif p_action in ('friend_respond','friend_cancel') then
    select * into request from public.fisch_requests where id=(p_payload->>'requestId')::uuid;
    if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
    if (p_action='friend_respond' and request.recipient_id<>p_owner) or (p_action='friend_cancel' and request.sender_id<>p_owner) then raise exception 'FORBIDDEN'; end if;
    other_id=case when request.sender_id=p_owner then request.recipient_id else request.sender_id end;
  elsif p_action='friend_remove' then other_id=(p_payload->>'friendId')::uuid;
  else raise exception 'UNKNOWN_ACTION'; end if;
  v_left=least(p_owner,other_id);v_right=greatest(p_owner,other_id);
  perform pg_advisory_xact_lock(hashtextextended(v_left::text||v_right::text,1));
  if p_action='friend_request' then
    if exists(select 1 from public.fisch_friendships f where f.left_id=v_left and f.right_id=v_right) then raise exception 'ALREADY_FRIENDS'; end if;
    select * into request from public.fisch_requests r where least(r.sender_id,r.recipient_id)=v_left and greatest(r.sender_id,r.recipient_id)=v_right and r.status='pending';
    if not found then
      insert into public.fisch_requests(sender_id,recipient_id) values(p_owner,other_id) returning * into request;
    end if;
    answer=jsonb_build_object('id',request.id,'status',request.status);
  elsif p_action in ('friend_respond','friend_cancel') then
    select * into request from public.fisch_requests where id=(p_payload->>'requestId')::uuid for update;
    if request.status<>'pending' then raise exception 'REQUEST_CLOSED'; end if;
    if p_action='friend_respond' and p_payload->>'decision' not in ('accept','decline') then raise exception 'INVALID_DECISION'; end if;
    request.status=case when p_action='friend_cancel' then 'cancelled' when p_payload->>'decision'='accept' then 'accepted' else 'declined' end;
    update public.fisch_requests set status=request.status,updated_at=now() where id=request.id;
    if request.status='accepted' then insert into public.fisch_friendships values(v_left,v_right,now()) on conflict do nothing; end if;
    answer=jsonb_build_object('id',request.id,'status',request.status);
  else
    delete from public.fisch_friendships f where f.left_id=v_left and f.right_id=v_right;
    if not found then raise exception 'FRIEND_NOT_FOUND'; end if;
    answer=jsonb_build_object('removed',true);
  end if;
  insert into public.fisch_operations(user_id,operation_id,signature,result) values(p_owner,p_operation,v_signature,answer);
  return answer;
end $$;

create function public.fisch_heartbeat(p_owner uuid) returns jsonb
language sql security invoker set search_path='' as $$
  insert into public.fisch_presence(user_id,last_seen) values(p_owner,now())
  on conflict(user_id) do update set last_seen=greatest(public.fisch_presence.last_seen,excluded.last_seen)
  returning jsonb_build_object('lastSeen',last_seen)
$$;

create function public.fisch_social_read(p_owner uuid,p_kind text,p_metric text default 'xp') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare answer jsonb;
begin
  if p_kind='leaderboard' then
    if p_metric not in ('xp','catches','weight') then raise exception 'INVALID_METRIC'; end if;
    with ranked as (
      select p.user_id as id,p.name,p.avatar,(floor(sqrt(s.total_xp/100.0))+1)::int as level,
        case p_metric when 'xp' then s.total_xp when 'catches' then s.total_caught else s.best_grams end as value,
        row_number() over(order by case p_metric when 'xp' then s.total_xp when 'catches' then s.total_caught else s.best_grams end desc,p.user_id) as rank
      from public.fisch_scores s join public.fisch_profiles p using(user_id)
    ) select jsonb_build_object('entries',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from ranked r where rank<=30),'[]'::jsonb),
      'self',(select to_jsonb(r) from ranked r where id=p_owner)) into answer;
  elsif p_kind='friends' then
    select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name,'avatar',p.avatar,
      'level',(floor(sqrt(s.total_xp/100.0))+1)::int,'online',coalesce(t.last_seen>now()-interval '90 seconds',false)) order by p.name,p.user_id),'[]'::jsonb)
      into answer from public.fisch_friendships f join public.fisch_profiles p on p.user_id=case when f.left_id=p_owner then f.right_id else f.left_id end
      join public.fisch_scores s using(user_id) left join public.fisch_presence t using(user_id) where p_owner in (f.left_id,f.right_id);
  elsif p_kind='requests' then
    with rows as (
      select r.*,jsonb_build_object('name',p.name,'avatar',p.avatar,'level',(floor(sqrt(s.total_xp/100.0))+1)::int) as profile
      from public.fisch_requests r join public.fisch_profiles p on p.user_id=case when r.sender_id=p_owner then r.recipient_id else r.sender_id end
      join public.fisch_scores s using(user_id) where p_owner in (r.sender_id,r.recipient_id) and r.status='pending'
      order by r.created_at desc,r.id limit 100
    ) select jsonb_build_object('incoming',coalesce((select jsonb_agg(jsonb_build_object('id',id,'profile',profile) order by created_at desc) from rows where recipient_id=p_owner),'[]'::jsonb),
      'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',id,'profile',profile) order by created_at desc) from rows where sender_id=p_owner),'[]'::jsonb)) into answer;
  else raise exception 'UNKNOWN_ACTION'; end if;
  return answer;
end $$;

-- Explicit function ACL: default PUBLIC EXECUTE would expose privileged owner parameters.
revoke all on function public.fisch_read_game(uuid),public.fisch_bootstrap(uuid,jsonb),
  public.fisch_commit_state(uuid,text,text,bigint,jsonb,jsonb,jsonb),public.fisch_social_command(uuid,text,text,jsonb),
  public.fisch_heartbeat(uuid),public.fisch_social_read(uuid,text,text) from public,anon,authenticated;
grant execute on function public.fisch_read_game(uuid),public.fisch_bootstrap(uuid,jsonb),
  public.fisch_commit_state(uuid,text,text,bigint,jsonb,jsonb,jsonb),public.fisch_social_command(uuid,text,text,jsonb),
  public.fisch_heartbeat(uuid),public.fisch_social_read(uuid,text,text) to service_role;
commit;
