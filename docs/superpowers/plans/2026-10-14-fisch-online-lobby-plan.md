# Fisch Online Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the user's selected Friends requests/list/online status and a real Top 30 to server-owned profiles and game progress.

**Architecture:** GitHub Pages serves the browser client; a separate Supabase project provides guest identity, database storage and a server game API. The online adapter implements the gameplay plan's GameService while Top/Friends use a SocialService. Local and online snapshots remain distinct.

**Tech Stack:** Supabase Auth/Postgres/Edge Functions; vendored browser bundle of @supabase/supabase-js 2.117.3 with pinned package/lockfile for bundling; Node 24 for adapter and online smoke tests. Backend source remains in the fisch repository.

**Spec:** `docs/superpowers/specs/2026-10-14-fisch-3d-design.md`

## Global Constraints

- Friends scope confirmed by the user: add/request/accept/decline/cancel/remove, friend list and online/offline status.
- Top 30 tabs: total XP, total catches and heaviest fish; show own rank separately.
- Guest identity asks for no email/password; clearing the browser or using another device does not guarantee recovering that identity.
- GameService methods and GameState/CastTicket/Catch types exactly match `2026-10-14-fisch-gameplay-plan.md`.
- Server chooses catch species/grams and computes price/XP from the same 25-species catalogue; client payloads never define rewards.
- Mutations are idempotent by user + operation ID; balance/inventory/stats update atomically.
- A pending operation is displayed as pending until the server confirms it.
- Local progress is not automatically merged/uploaded into online rankings.
- Public client configuration contains only project URL and publishable key. Service-role/secret keys stay in server runtime.
- Every exposed table has RLS, with ownership/participant checks where applicable.
- No invented online players, friends or rankings.

## Provisioning Prerequisites

As of 2026-10-14, there is no fisch Supabase project. Available organization: `FGadaruugan's Org`; retrieve its actual ID from list_organizations after the user chooses it. Existing My_Homework and Mini-3Dgame projects are unrelated to this game.

Before project creation, explicitly ask which organization to use. Call get_cost with that chosen organization, repeat the returned amount/recurrence, and obtain the required cost confirmation before create_project. If the user authorizes a different existing project, use it only within that authorization. Do not modify another game's backend by assumption.

Select the actual fisch project ID from a create/get/list result; never synthesize it. Wait for its healthy state. Check the current changelog, anonymous Auth, RLS, function permissions and CLI help before implementing. Enable guest sign-ins through supported project configuration; if that capability is unavailable, provide the exact configuration step after preparing the concrete client/server source. Continue independent gameplay/client work while a backend-only prerequisite is pending.

## File Map

- `supabase/schema.sql`: canonical reviewed schema/functions/policies/seeds.
- `supabase/migrations/<CLI-generated-name>.sql`: generated final migration; obtain its real filename from the CLI, do not invent a timestamp.
- `supabase/functions/fisch-api/index.ts`: verified-identity game/social endpoints.
- `supabase/functions/fisch-api/catalogue.js`: generated shared game catalogue data.
- `supabase/functions/fisch-api/commands.js`: injected server command orchestration around shared game-rules.js.
- `supabase/functions/fisch-api/social-rules.js`: request authorization, ranking and presence rules.
- `js/services/online.js`: async GameService implementation and cached snapshots.
- `js/services/social.js`: Top/Friends/presence APIs.
- `js/online-config.js`: public URL/publishable-key configuration.
- `scripts/vendor-online.mjs`: bundle the pinned SDK locally; source and license metadata.
- `tests/online-adapter.test.js`, `tests/social.test.js`: injected-network behavioral tests.
- `tests/online-smoke.mjs`: actual separate guest identities testing the configured backend.
- `js/lobby.js`, `js/main.js`, `README.md`: connection mode, real social panels and setup.

## Review Focus

1. Two retrying finish/sell calls must produce one reward/credit — Task 2.
2. User A must not accept user B's request to user C or inspect another private Backpack — Task 1/2.
3. Out-of-order leaderboard responses must not replace the currently selected tab — Task 4.
4. One backgrounded browser tab must not mark a still-active session offline — Task 3.
5. A disconnect must not replace online progress with an older local snapshot — Task 4.

### Task 1: Guest identity, state ownership and database contract

**Files:** Create `supabase/schema.sql`, CLI-generated migration, `tests/online-smoke.mjs`.

**Interfaces:**
- Consumes: gameplay catalogue and GameState; authenticated guest IDs.
- Produces: owner-readable/server-writable `fisch_state` snapshots; limited public `fisch_profiles` (ID, nickname, avatar, friend code) and `fisch_scores` (XP/count/heaviest grams/species).
- Participant-readable `fisch_requests` and `fisch_friendships`; server-controlled `fisch_presence`, `fisch_sessions`, `fisch_operations`.
- `fisch_requests`: sender ID, recipient ID, pending/accepted/declined/cancelled state; at most one pending request per unordered pair; self-request invalid.
- `fisch_friendships`: canonical ordered pair with a unique constraint; membership rows visible only to either participant.
- Add indexes for owner lookups, unique friend code, incoming/outgoing pending requests and the three score sorts (metric descending, user ID ascending).

- [ ] **Step 1: Write the online smoke test harness** using two independently created guest sessions (A/B) and a third C when testing unrelated requests. Never print tokens. Assertions: A can read own state, cannot read B's private state; direct client writes cannot change XP/coin; unauthenticated state reads fail; profile/score reads contain only intended public fields.
- [ ] **Step 2: Run** `node tests/online-smoke.mjs --phase ownership` against the selected configured fisch project.
  Expected: FAIL because fisch tables/service contracts do not exist. If provisioning is pending, record that dependency and finish source preparation without claiming a live test.
- [ ] **Step 3: Implement** tables, constraints and RLS with execute_sql, using actual guest identities for policy checks. Store integer grams and non-negative XP/coin; validate snapshot catalogue fields in server API. Client update policies for profile name/avatar preserve the user ID with both USING and WITH CHECK.
- [ ] **Step 4: Run** the same ownership smoke test and Supabase advisors.
  Expected: ownership tests pass; no unresolved applicable RLS/permission advisor finding. Generate the final migration through the Supabase skill's supported CLI workflow after checking --help; commit canonical schema.sql too. If CLI is unavailable, record the reproducible schema source and migration-history limit.
- [ ] **Step 5: Commit** `feat: add guest profiles and owned online game storage`.

### Task 2: Server-owned game commands and idempotent API

**Files:** Create `supabase/functions/fisch-api/index.ts`, `supabase/functions/fisch-api/commands.js`, generated `catalogue.js`, `tests/server-game.test.js`; extend `tests/online-smoke.mjs`.

**Interfaces:**
- Consumes: the exact GameService contract and applyGameMutation(state,{action,payload},{now}) from the gameplay plan; authenticated JWT verified by Supabase Auth.
- Produces: `runGameCommand({ownerId,action,operationId,payload},{database,now,rng}):Promise<ApiResult>` in commands.js; ApiResult follows the response shape below.
- Produces: fisch-api actions `bootstrap`, `start_cast`, `finish_cast`, `cancel_cast`, `sell_fish`, `buy_rod`, `equip_rod`, `travel`, `update_profile`.
- Every response is `{ok:true,snapshot:GameState,result?:unknown}` or `{ok:false,error:{code:string,message:string}}`. Requests use `{action,operationId,payload}`.
- Server derives owner ID from verified identity, not the request body. Pure game rules use the same catalogue/constants as the local service.
- Database commit RPC `fisch_commit_state(ownerId,operationId,expectedRevision,snapshot,result)` is SECURITY INVOKER, executable only by service_role after revoking PUBLIC/anon/authenticated. Edge runtime keeps the server key secret. It locks the owner state, returns an existing operation result for a retry, checks the expected revision, and atomically commits the new state/score/result. A revision conflict makes the server re-read/apply the pure mutation again, at most three attempts; then return CONFLICT_RETRY. The revision is transport metadata outside GameState. Ticket creation/consumption is committed in the same owner transaction.
- A cast ticket is sampled once, belongs to one owner/island/rod and can finish once; client finishes with only ticket ID and outcome. The server enforces minimum elapsed wait plus the shortest possible successful reel duration before awarding.

- [ ] **Step 1: Write failing rule tests** for malformed/unknown actions, invalid island/rod, capacity 100, forged grams/XP, duplicate command IDs, insufficient funds, selling an already-sold catch, double finish and a ticket owned by another user. Use injected clock/rng/database adapter; no privileged key in fixtures.
- [ ] **Step 2: Run** `node --test tests/server-game.test.js`.
  Expected: FAIL because server command/rule exports do not exist.
- [ ] **Step 3: Implement** pure command rules and the authenticated Edge API. Bootstrap creates profile/state/score atomically. Catch/sell/buy/equip transaction validates fresh state, updates ranking aggregates, and returns the committed snapshot. Escaped/cancelled casts award nothing. Persist IDs/results for retries. Generate the server catalogue from the canonical JS data, rather than manually duplicating 25 rows.
- [ ] **Step 4: Run** unit suite, deploy fisch-api, then `node tests/online-smoke.mjs --phase game`.
  Expected: repeated finish/sell credits once, forged rewards and foreign tickets rejected, online state/ranking agree. Minimum elapsed-time checks use the ticket's server-selected wait plus 4.8 seconds (0.72/0.15 reel progress); do not trust a client-reported duration or reward.
- [ ] **Step 5: Commit** `feat: add authenticated atomic online fishing commands`.

### Task 3: Friend requests, presence and Top 30

**Files:** Extend `supabase/schema.sql`, `fisch-api/index.ts`; create `supabase/functions/fisch-api/social-rules.js`, `js/services/social.js`, `tests/social.test.js`; extend online smoke tests.

**Interfaces:**
- Consumes: caller identity, participant RLS and public profile/score fields.
- Produces: `validateFriendAction({callerId,request,membership},action):void`, `isOnline(lastSeen,now):boolean`, `rankScores(scores,metric,callerId):LeaderboardResult` in supabase/functions/fisch-api/social-rules.js, shared with tests. Server authorization, uniqueness and transitions remain enforced transactionally.
- Produces: `SocialService.listFriends()`, `listRequests()`, `sendRequest(friendCode,operationId)`, `respondRequest(requestId,decision,operationId)`, `cancelRequest(requestId,operationId)`, `removeFriend(friendId,operationId)`, `heartbeat()`, `getLeaderboard(metric)`.
- Decision is `"accept"` or `"decline"`; metric is `"xp"`, `"catches"` or `"weight"`.
- Leaderboard response `{entries:PublicRank[],self:PublicRank|null}`, where PublicRank has rank/id/name/avatar/level/value. Sort metric descending then user ID ascending; LIMIT 30. Own rank is computed over all participants.
- Presence updates use server time; visible tabs heartbeat every 30 seconds. A profile is online when its last server heartbeat is less than 90 seconds old. Hiding/closing a tab stops its heartbeat without overwriting another tab's presence.

- [ ] **Step 1: Write failing tests** for self-request, unknown code, repeated/crossed request, accepting as sender/unrelated C, pending→accepted exactly once, cancel/decline, friendship removal and presence TTL at 89/90 seconds. Crossed pending request returns the existing pending relation rather than creating a second one. Test stable ranking ties and a self rank outside Top 30.
- [ ] **Step 2: Run** `node --test tests/social.test.js`.
  Expected: FAIL because social rules/adapter exports do not exist.
- [ ] **Step 3: Implement** request transactions and social action handlers. Only recipient can respond; only sender can cancel; either member can remove friendship. Friend list joins accepted memberships to public summaries/presence. Validate friend codes and paginate request lists. Public leaderboard reads do not expose Backpack, balance or private state.
- [ ] **Step 4: Run** unit suite and `node tests/online-smoke.mjs --phase social`.
  Expected: two real guest identities can request/accept/list/remove; C cannot act on A/B's relation; presence uses backend timestamps; leaderboard/self rank matches server state. Run applicable advisors again after schema changes and generate the corresponding final migration/source.
- [ ] **Step 5: Commit** `feat: add real friends presence and leaderboards`.

### Task 4: Online adapter, lobby connection and full verification

**Files:** Create `js/services/online.js`, `js/online-config.js`, `scripts/vendor-online.mjs`, `tests/online-adapter.test.js`; modify `js/lobby.js`, `js/main.js`, `scripts/package-site.mjs`, `package.json`, `README.md`.

**Interfaces:**
- Consumes: game/social API contracts; local service and lifecycle adapter; pinned Supabase SDK.
- Produces: `createOnlineService({client,config}):Promise<GameService>`, `createSocialService({client,config}):SocialService`; cached immutable snapshots/subscriptions.
- Config `{url,publishableKey}` contains public values only. Empty config produces unavailable-online status and keeps local play usable. Local and online mode switches load their respective independent snapshots.
- Each pending command retains its operationId across network retries; older responses cannot replace a newer snapshot. Leaderboard tabs use a request generation ID to ignore stale responses.

- [ ] **Step 1: Write failing adapter tests** with injected transport for retries using the same ID, out-of-order snapshots/tab responses, auth failure, missing config, offline mode switch and pending UI completion. Assert an unconfirmed catch is not presented as a committed reward.
- [ ] **Step 2: Run** `node --test tests/online-adapter.test.js`.
  Expected: FAIL because online adapter does not exist.
- [ ] **Step 3: Bundle** SDK 2.117.3 into vendor with its license, pin input package versions and commit the lockfile. Implement guest identity bootstrap/session handling and API adapters. Refresh snapshot on reconnect; never copy local scores into online state.
- [ ] **Step 4: Wire** Top XP/catches/weight tabs and own rank; Friends own code/copy, incoming/outgoing requests, accept/decline/cancel, friend profile summary/remove and online badge. Add loading/empty/error/retry states and visible-tab heartbeat. Profile clearly labels local or online identity.
- [ ] **Step 5: Run** `npm test && npm run check && npm run package`, then `node tests/online-smoke.mjs --phase all` against the actual fisch backend.
  Expected: all unit/site/package/ownership/game/social checks pass. Browser QA, if available: independent sessions request/accept, ranking updates after catches, reload retains online progress, disconnect/retry does not duplicate awards.
- [ ] **Step 6: Commit/publish** `feat: connect online profiles top and friends lobby`. Record actual backend deployment, source commit and Pages workflow result. If provisioning or guest-sign-in configuration is blocked, deliver all prepared source and the exact remaining configuration action; do not claim real Top/Friends are active.

## Completion Evidence

The local game stays playable. Real Top/Friends are claimed active only after the configured backend is deployed and separate-user smoke tests pass. Save schema/function/client source in the same fisch GitHub repository; never commit secret keys.

## References

- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://github.com/supabase/supabase-js/releases/tag/v2.117.3

## Execution Handoff

Prepared for user review after the gameplay plan. Native execution is recommended because the online GameService must preserve the gameplay interface and idempotent lifecycle.
