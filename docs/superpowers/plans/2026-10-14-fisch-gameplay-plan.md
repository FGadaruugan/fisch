# Fisch 3D Gameplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a playable PC/mobile 3D fishing game with 25 species, three islands, Backpack, rods, XP, Profile and lobby.

**Architecture:** A buildless browser ES-module client uses Three.js for the world. A pure fishing controller and a GameService boundary keep game rules independent of rendering; the local implementation persists validated snapshots. Online Top/Friends use explicit unavailable states until the separate online plan connects a backend.

**Tech Stack:** JavaScript ES modules; Three.js r186 vendored with license and its imported core module; HTML/CSS; Node 24 built-in test runner. No runtime CDN dependency.

**Spec:** `docs/superpowers/specs/2026-10-14-fisch-3d-design.md`

## Global Constraints

- Exactly 25 species: Normal 10, Rare 8, Legendary 4, Mythic 2, `???` 1.
- Name and weight in kg are visible per catch; store integer grams and display kg to two decimals.
- Palm Bay: Lv.1, 7 species; Coral Reef: Lv.3, 8; Frostpeak: Lv.5, 10.
- Lv.n requires total XP = 100 × (n−1)². XP per rarity is 12/32/80/180/400.
- Fish capacity is 100. Rods do not count against it.
- Starter/River/Ocean cost 0/150/650 coin and have bar widths 0.24/0.30/0.36.
- Base rarity weights: 68/25/6/0.9/0.1; Ocean multiplies all non-Normal weights by 1.35, then normalizes available tiers.
- Cast wait 2–5 seconds; bite window 1.8 seconds; reel begins at 0.28, gains 0.15/s, loses 0.10/s, times out after 20 seconds.
- Target speed by rarity is 0.20/0.28/0.36/0.44/0.52; held player bar moves +0.55/s, released −0.35/s.
- Mongolian guidance; UI labels may retain Lobby/Backpack/Profile/Top/Friends.
- WASD/arrows, Space jump, F fishing, E interaction, B Backpack, Escape close/cancel; touch joystick, drag camera and separate action/jump/interaction buttons.
- On visibility/focus loss release inputs and pause local simulation timers.
- Minimum touch target 44 CSS px; support portrait/landscape and safe areas.
- Top/Friends do not show invented players or records.

## Review Focus

1. Reload during a fishing action must not restore a pending award or give duplicate XP — Task 2.
2. A pointer released outside its original button must clear held fishing/joystick input — Task 4.
3. A saved profile that names an invalid or locked island must spawn on Palm Bay — Task 2.
4. A delayed finish callback after cancel/travel must not add a fish — Task 3.
5. Opening a menu while a movement key is held must stop walking immediately — Task 5.

## Execution Setup

Use the existing repository source through GitHub; preserve the tracked design/plans. At execution, apply using-git-worktrees, work on an isolated `feat/fisch-gameplay` branch, and record task progress in the executing-plans ledger. Fetch dependencies from the official r186 tag/package only at implementation time; vendor all imported files and the MIT license. Keep vendoring metadata in `vendor/README.md`.

File map:
- `js/data.js`: catalogue, rarity/rod/island metadata and sampling.
- `js/progression.js`: level, price and unlock functions.
- `js/save.js`: validation and storage.
- `js/game-rules.js`, `js/errors.js`: pure game mutations and stable GameError codes.
- `js/services/local.js`: GameService operations and snapshots.
- `js/fishing.js`: pure fishing state machine.
- `js/world.js`, `js/player.js`, `js/input.js`: 3D factories, movement, camera and input.
- `js/ui.js`, `js/lobby.js`, `js/main.js`: views, navigation and lifecycle.
- `index.html`, `css/game.css`: game shell and responsive styles.
- `scripts/check-site.mjs`, `scripts/package-site.mjs`: import/asset checks and static output.
- `tests/*.test.js`: meaningful catalogue, business rule, fishing and lifecycle tests.

Shared types:
- `FishSample = {speciesId:string, weightGrams:number, islandId:string}`.
- `Catch = FishSample & {id:string, caughtAt:string}`.
- `GameState = {version:1, profile:{name:string,avatar:number}, coins:number, totalXp:number, fish:Catch[], rods:string[], equippedRod:string, stats:{totalCaught:number,rarityCounts:Record<string,number>,bestCatch:Catch|null}, collection:string[], lastIsland:string}`.
- `CastTicket = FishSample & {id:string,rodId:string,waitSeconds:number,biteSeconds:1.8}`.
- Service errors use `GameError` with a stable `code`; UI maps codes to Mongolian messages.
- Every mutating service method is async; reads are synchronous snapshots and subscribers receive immutable copies.

### Task 1: Catalogue, pricing and level rules

**Files:** Create `package.json`, `js/data.js`, `js/progression.js`, `tests/data.test.js`.

**Interfaces:**
- Consumes: the exact 25 catalogue rows and rarity/rod/island values in the spec.
- Produces: `FISH`, `RARITIES`, `RODS`, `ISLANDS` as frozen maps; `sampleFish(islandId,rodId,rng=Math.random):FishSample`; `levelForXp(totalXp):number`; `nextLevelXp(totalXp):number`; `canVisit(islandId,totalXp):boolean`; `fishPrice(sample):number`; `formatKg(weightGrams):string`.

- [ ] **Step 1: Write failing boundary and distribution tests.**

```js
assert.equal(Object.keys(FISH).length, 25);
assert.deepEqual(countByRarity(FISH), {Normal:10,Rare:8,Legendary:4,Mythic:2,"???":1});
assert.equal(levelForXp(399), 2);
assert.equal(levelForXp(400), 3);
assert.equal(canVisit("coral", 399), false);
assert.equal(canVisit("coral", 400), true);
assert.equal(canVisit("frost", 1600), true);
assert.equal(formatKg(3420), "3.42");
```

Test helpers live in the test file. Test deterministic rng values at 0 and just below 1: every sampled fish belongs to that island and its grams are within its species bounds. Use island IDs `palm`, `coral`, `frost` and rod IDs `starter`, `river`, `ocean` throughout.

- [ ] **Step 2: Run** `node --test tests/data.test.js`.
  Expected: FAIL because catalogue/rule exports do not exist.
- [ ] **Step 3: Implement** the listed exports using the spec data. Sampling removes absent tiers, applies rod weights, then selects uniformly within the selected tier. In package.json set `type:"module"` and `test:"node --test tests/*.test.js"`.
- [ ] **Step 4: Run** `node --test tests/data.test.js`.
  Expected: all catalogue, endpoint and level tests pass.
- [ ] **Step 5: Commit** `feat: add fish catalogue and progression rules`.

### Task 2: Backpack, local GameService and resilient save

**Files:** Create `js/save.js`, `js/game-rules.js`, `js/errors.js`, `js/services/local.js`, `tests/service.test.js`, `tests/save.test.js`.

**Interfaces:**
- Consumes: Task 1 exports, GameState/Catch/CastTicket.
- Produces: `createInitialState():GameState`; `normalizeState(input):GameState`; `createLocalService({storage,now,rng,onStorageError}):GameService`.
- Produces: `GameError(code,message)` from js/errors.js; `applyGameMutation(state,{action,payload},{now}):{state:GameState,result:unknown}` from js/game-rules.js. Mutation actions are award_catch/sell_fish/buy_rod/equip_rod/travel/update_profile; award_catch consumes a trusted ticket, sell_fish consumes catch IDs, and other payloads match their GameService method. The service owns ticket validity and operation deduplication.
- GameService: `getSnapshot():GameState`; `subscribe(fn):()=>void`; `startCast(islandId):Promise<CastTicket>`; `finishCast(ticketId,outcome):Promise<Catch|null>`; `cancelCast(ticketId):Promise<void>`; `sellFish(ids,operationId):Promise<void>`; `buyRod(rodId,operationId):Promise<void>`; `equipRod(rodId):Promise<void>`; `travel(islandId):Promise<void>`; `updateProfile({name,avatar}):Promise<void>`. Outcome is `"caught"` or `"escaped"`.
- Storage key: `fisch3d.save.v1`. Tests inject a memory storage and fixed clock/rng.

- [ ] **Step 1: Write failing service/save tests.**

```js
const ticket = await service.startCast("palm");
const fish = await service.finishCast(ticket.id, "caught");
assert.equal(service.getSnapshot().fish.length, 1);
const xp = service.getSnapshot().totalXp;
await service.finishCast(ticket.id, "caught");
assert.equal(service.getSnapshot().totalXp, xp);
await service.sellFish([fish.id], "sale-1");
const coins = service.getSnapshot().coins;
await service.sellFish([fish.id], "sale-1");
assert.equal(service.getSnapshot().coins, coins);
assert.equal(service.getSnapshot().stats.totalCaught, 1);
assert.equal(service.getSnapshot().collection.length, 1);
```

Also assert: unknown IDs and negative/non-finite coin/XP normalize safely; duplicate catch IDs are removed; invalid grams are rejected; invalid/locked lastIsland falls back to palm; pending cast is not saved; storage exceptions do not crash; capacity 100 blocks startCast; insufficient coin rejects buy; unowned rod rejects equip; sell preserves bestCatch/collection; snapshots cannot mutate service state. Nickname is trimmed, 1–18 characters, rendered as text; avatar is an integer 0–5.

- [ ] **Step 2: Run** `node --test tests/service.test.js tests/save.test.js`.
  Expected: FAIL because service/validation exports do not exist.
- [ ] **Step 3: Implement** validated snapshots and the GameService. Starter is owned/equipped initially. Only a live ticket can finish; a consumed/cancelled ticket returns null. Clamp valid bounded counters; reject unrecognized catalogue values. Recompute unlocked islands from XP. Mutations persist and notify; storage errors call the optional onStorageError("SAVE_UNAVAILABLE") callback without losing the session state. Implement business mutations in the pure applyGameMutation function, consumed by both local service and the later server plan.
- [ ] **Step 4: Run** `npm test`.
  Expected: all data, service and save tests pass.
- [ ] **Step 5: Commit** `feat: add backpack economy and validated local saves`.

### Task 3: Skill-based fishing controller

**Files:** Create `js/fishing.js`, `tests/fishing.test.js`.

**Interfaces:**
- Consumes: CastTicket and rarity/rod constants.
- Produces: `createFishingController({onFinish}):FishingController`.
- Methods: `start(ticket):void`, `press():void`, `release():void`, `tick(dtSeconds):void`, `cancel():void`, `getView():FishingView`.
- `FishingView = {phase,charge,target,bar,progress,remaining,ticketId}`. Callback `onFinish({ticketId,outcome})` fires once for caught/escaped. Phases match the spec; cancel returns to idle and invalidates callbacks.

- [ ] **Step 1: Write failing tests** for charging→waiting→bite→reeling, late bite escape, reel success/zero/20-second timeout, held/released bar speed, target reflection, cancel from every active phase, stale callback rejection and one onFinish. A paused game does not call tick; assert the view is unchanged over simulated hidden time. Ignore invalid dt; clamp interactive ticks to 0.05 seconds.
- [ ] **Step 2: Run** `node --test tests/fishing.test.js`.
  Expected: FAIL because controller export does not exist.
- [ ] **Step 3: Implement** the pure state machine with the exact global constants. Charge caps at 1 over 1.2 seconds; release starts the ticket's wait. Callback reports a result; the GameService owns awarding and persistence.
- [ ] **Step 4: Run** `npm test`.
  Expected: all tests pass, including duplicate/cancel cases.
- [ ] **Step 5: Commit** `feat: implement cast bite and reel fishing loop`.

### Task 4: Three islands, third-person player and input

**Files:** Create `vendor/three.module.js`, `vendor/three.core.js`, `vendor/LICENSE-three.txt`, `vendor/README.md`, `js/world.js`, `js/player.js`, `js/input.js`, `tests/player-input.test.js`.

**Interfaces:**
- Consumes: ISLANDS; stable island IDs; Three.js r186.
- Produces: `createWorld(THREE,islandId):World` with `group`, `spawn`, `seller`, `ferry`, `isWalkable(x,z)`, `heightAt(x,z)`, `fishingSpot(position)`, `dispose()`.
- `createPlayer(THREE,world):Player` with `group`, `position`, `tick(input,dt)`, `reset(world)`, `getCameraPose(yaw,pitch,distance)`.
- `createInput({window,canvas,joystick,action,jump,interact}):Input` with `getSnapshot()`, `releaseAll()`, `setEnabled(bool)`, `dispose()`.
- Input snapshots contain moveX/moveZ/actionHeld/jumpPressed/interactPressed/backpackPressed/cancelPressed/lookDeltaX/lookDeltaY. getSnapshot consumes one-frame presses/look deltas while held inputs remain set.
- Movement input is normalized; walk speed 5.5 units/s, jump initial velocity 7 units/s and gravity −20 units/s².

- [ ] **Step 1: Write failing movement/input tests** using injected EventTargets and pure position updates: diagonal speed equals axial speed; water boundary prevents entry; ground landing is stable; invalid/large dt cannot teleport; pointerup outside action and pointercancel release held state; changing input enablement clears all keys. Define collision rules as island radius 23 with a pier rectangle x∈[−2,2], z∈[18,34], ground y=0.8; NPCs stand off the path.
- [ ] **Step 2: Run** `node --test tests/player-input.test.js`.
  Expected: FAIL because input/player exports do not exist.
- [ ] **Step 3: Vendor** official r186 modules and imported core, verify their imports resolve locally, and add the MIT license/source record. Build three distinctive islands with palm/coral/snow decorations, pier, seller/ferry, ocean, sky and boat prop. Share materials/geometries; dispose per-island resources on travel. Build a visible humanoid with a fishing rod and walking/jump animation.
- [ ] **Step 4: Implement** movement, collision, camera orbit, normalized touch joystick and pointer capture. Camera distance range 5–15, pitch range 0.15–1.05 radians. Route F/action through semantic events; no movement while editing a text field or in menus.
- [ ] **Step 5: Run** `npm test`.
  Expected: all tests pass. When browser QA is permitted/available, inspect all three islands and both viewport orientations; otherwise record the visual verification limit.
- [ ] **Step 6: Commit** `feat: add island worlds player camera and mobile controls`.

### Task 5: Lobby, Backpack, Profile and game lifecycle

**Files:** Create `index.html`, `css/game.css`, `js/ui.js`, `js/lobby.js`, `js/main.js`, `js/app.js`, `tests/app.test.js`.

**Interfaces:**
- Consumes: GameService; FishingController; World/Player/Input; progression functions.
- Produces: `createApp({service,fishing,input,worldFactory,view}):App` with `play()`, `openPanel(name)`, `closePanel()`, `travel(islandId)`, `dispatch(command,payload):Promise<void>`, `tick(dt)`, `setVisible(bool)`, `dispose()`.
- worldFactory(islandId) returns a scene context containing world/player, update(input,dt) and dispose(); the main.js closure handles attaching/detaching its groups to the Three scene.
- `createUI({document,onCommand}):View` and `createLobby({root,onNavigate}):LobbyView` own DOM rendering. LobbyView exposes renderHeader(state) and showPanel(name); createUI composes it.
- View interface: `renderSnapshot(state)`, `renderFishing(view)`, `showPanel(name)`, `showNotice(code)`, `showCatch(catch)`, `setBusy(bool)`. Render user-entered names with textContent.
- Lobby navigation: play/backpack/profile/top/friends/shop/settings/map. Camera continues a slow lobby orbit; player controls activate only during Play.
- Busy async commands disable repeat activation; catch display waits for finishCast success. Travel waits for an already-submitted finish to settle. Cancelling invalidates unsubmitted tickets; it does not undo an award the server already committed.

- [ ] **Step 1: Write failing lifecycle tests** with fake service/view/input: menu opening cancels ticket and clears movement; travel cannot proceed to a locked island; an unsubmitted stale finish callback after travel grants nothing; a previously submitted finish settles before travel and creates exactly one catch notice; rejected buy/finish shows an error and re-enables action; hide/show never advances timer; disposed app removes subscriptions.
- [ ] **Step 2: Run** `node --test tests/app.test.js`.
  Expected: FAIL because app export does not exist.
- [ ] **Step 3: Implement** the lifecycle adapter and UI. Use an ocean-teal/ivory palette, readable sans serif text, a 3D-first play view, compact HUD, left joystick/right controls and responsive panel drawers. Lobby contains Play, Backpack, Top, Profile, Friends, Shop and Settings with level/coins header.
- [ ] **Step 4: Implement** Backpack fish/rod tabs, rarity filter, weight/value sort, individual/all sale at the merchant; equip; Profile stats/collection with secret species hidden until caught; travel menu locks; nickname/avatar editor; low/normal graphics and mute controls. Generate short UI sounds with Web Audio only after user interaction; gracefully ignore unavailable audio.
- [ ] **Step 5: Wire** main.js renderer setup, capped pixel ratio (low 1; normal min(devicePixelRatio,1.5)), resize/orientation, visibility events, loading/error/retry UI and local service. An unavailable WebGL renderer displays a useful retry message. Top/Friends show the unavailable-online state.
- [ ] **Step 6: Run** `npm test`.
  Expected: all tests pass. Browser QA if available: lobby→Play→cast→catch→Backpack→sell→buy/equip→Profile→reload; mobile joystick/camera/action; unlocked island travel. Do not claim browser checks when unavailable.
- [ ] **Step 7: Commit** `feat: build responsive lobby backpack profile and gameplay UI`.

### Task 6: Static packaging and GitHub delivery

**Files:** Create `scripts/check-site.mjs`, `scripts/package-site.mjs`, `.github/workflows/pages.yml`, `README.md`, `.gitignore`; modify `package.json`.

**Interfaces:**
- Consumes: completed site files, local-only vendor imports, green npm test output.
- Produces: `npm run check` verifies JS syntax, local imports and referenced asset paths; `npm run package` emits `dist/` containing only the browser files/dependencies. Source/tests/configuration docs are not shipped as site assets.
- Workflow tests/checks, packages, uploads a Pages artifact and deploys from main with only needed contents/pages/id-token permissions.

- [ ] **Step 1: Implement** packaging/reference checks using Node built-ins. Preserve relative paths so the app runs under `/fisch/`. Keep source static and exclude credentials, dev dependencies and test files from dist.
- [ ] **Step 2: Run** `npm test && npm run check && npm run package`.
  Expected: all tests/checks pass and dist/index.html plus every import/asset exists.
- [ ] **Step 3: Write** Mongolian README covering controls, features, catalogue counts, local HTTP server, save behavior and online service status. Add vendor credits, .gitignore for node_modules/dist/local runtime artifacts and the Pages workflow.
- [ ] **Step 4: Commit** `build: package static game and add GitHub Pages deployment`.
- [ ] **Step 5: Review** the complete branch against the spec and test evidence. Publish the tested source to the requested fisch repository through supported GitHub tools; preserve concurrent remote changes. Observe actual workflow/deployment results when available. If Pages cannot be enabled with available capabilities, report the repository and the exact remaining hosting step; do not present an unverified live URL as working.

## Completion Evidence

Record actual test counts, syntax/asset checks, packaging output, source commit and deployment status. Note browser QA limits. The local game must work independently of online provisioning; Top/Friends complete in the separate online plan.

## Execution Handoff

Prepared for user review. Native execution is recommended: the six tasks share catalogue, service and lifecycle interfaces, so one implementer can keep those contracts consistent. A final independent review follows the chosen execution workflow.
