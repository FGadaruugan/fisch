# Sanctuary Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Track steps with checkboxes.

**Goal:** Ship a Level 7 fourth island, five fish, three rods, a secret exchange and a live world map.

**Architecture:** Extend the immutable catalogue and shared pure mutations. Reuse existing terrain streaming, App interaction and owner-bound idempotent Edge command boundaries. Render both map surfaces from the actual terrain coordinates.

**Tech Stack:** Existing JavaScript, Three.js, Node tests, Supabase Edge and GitHub Pages; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-15-sanctuary-design.md`

## Global constraints

- Four islands in a 4000-unit sea; Sanctuary [1070,580], radius 225, Level 7 / 3600 XP.
- Five new fish, one per rarity; rods cost 10,000 / 50,000 / secret 100,000 plus five held species.
- Shrine offset [-112,-76], range 7. Preserve previous saves and all lifetime statistics.
- No schema, auth, dependency, legacy Site or unrelated project changes.

## Review focus

- All-five collection after sale must not permit trading absent inventory.
- Duplicate/concurrent requests must not charge twice or partially consume fish.
- A secret rod must never be bought through the ordinary purchase action.
- Opening a secret panel remotely or switching accounts cannot bypass requirements.
- A fourth island and cached HTML must produce valid streamed geometry and working map controls.

### Task 1: Content and transactional exchange

**Files:** `js/data.js`, new `js/trade.js`, `js/game-rules.js`, both services, server `commands.js`, generated `shared-game.js`, catalogue/trade/server/save tests.

**Interfaces:** `SECRET_TRADE` defines canonical requirements. `secretTradePoint()` returns world x/z. `getSecretTradeInfo(state)` returns held requirement rows and status. Services expose `tradeRod(rodId,position,operationId)`; server allows `trade_rod` with rodId/position only.

- [x] Write/run RED tests: five tiers, exact costs, 3599/3600 XP, atomic held-fish trade, direct-buy bypass, sold/duplicate fish, invalid location and idempotent/concurrent command behavior.
- [x] Implement catalogue, pure trade helpers/rules and both service adapters; sync server.
- [x] Run targeted/full tests GREEN and commit the transactional layer (120 tests passed).

### Task 2: Discoverable island and secret interaction

**Files:** terrain/navigation/archipelago/world, new `js/models/sanctuary.js`, App, UI/backpack and new secret trade panel, CSS and scene/App tests.

**Interfaces:** `world.secret` is the current island's shrine point or null. Context `secret` permits nearby interaction. `trade_rod` dispatch requires active play, on-foot shrine proximity and the secret panel. `renderSecretTrade(state,context)` shows exact held specimens and costs.

- [x] Write/run RED tests for Level 7 terrain, reachable shrine, secret interaction/submission gating and actual Three.js geometry/disposal.
- [x] Add ruin landmarks/clearing and trader, wire E/mobile interaction and guarded secret panel.
- [x] Run relevant/full tests GREEN and commit the island/UI integration (125 tests passed).

### Task 3: Live map and release

**Files:** new `js/ui/chart.js`, navigation/map UI, HTML/CSS, documentation, generated web assets and map tests.

**Interfaces:** `createMapSurface(doc,{compact})` builds a coordinate-correct SVG map; `updateMapSurface(root,context)` updates player and route without rebuilding. `ensureVoyageHud(doc)` upgrades cached compass markup.

- [x] Write/run RED map tests for four coastlines, player/destination projection and cached HUD upgrade.
- [x] Replace compass readout with clickable live map and responsive full map; update docs.
- [x] Run full tests, package, check and diff check; commit and request one whole-branch review.
- [ ] Resolve review, deploy the existing fisch-api function, publish GitHub PR/Pages and verify source/runtime bytes.

## Execution ledger

Ruling: execute inline in the existing clean linked feature worktree; the user requested implementation and has already selected GitHub publication. Continue without extra process approval gates. One fresh whole-branch review is required by the inline workflow.

Ruling: Level 7 gates both the new island and secret trade; "5 fight" is interpreted as five new fish, not combat. This fits the fishing catalogue and the requested all-five exchange.

Pre-flight: Tasks 1→2 share SECRET_TRADE, secretTradePoint and service.tradeRod; Task 2→3 shares navigation position/destination. No conflicting signatures. Exchange location is client-reported; only inventory/currency/level are server-authoritative.

Task 1: complete — eight new failing tests reproduced the absent content/trade, then all passed. The full suite passes 120 tests. Original catalogue assertions now explicitly cover the preserved original islands; Profile/navigation expectations cover the added Level 7 island.

Task 2: complete — five new RED/GREEN regressions cover hidden interaction, proximity/on-foot enforcement, reachable collision geometry, resource disposal and the formerly hardcoded three-island ocean shader. Full suite 125 passed. Both streamed-world dynamic getters and all catalogue counters now include Sanctuary.

Task 3: implemented — three map tests failed first then passed for actual coastlines, live positions/routes and cached compass upgrade. Full suite 128 passed; package produced 20 files / 1192 KB / 329 KB gzip, static checks covered 96 JS/TS files and 56 HTML IDs, and whitespace checks passed. Whole-branch review and publication remain.

Review: a fresh whole-branch reviewer independently verified all 128 tests, static checks and generated runtime/CSS/index parity. After resuming an interruption from a service usage limit, it found no substantive trade, concurrency, owner-switch or collision defect. Its one P3 finding was portrait minimap overlap with the location clock; the map now starts below that card. Root also removed the obsolete 220px mobile map height, explicitly making the square map fill available width. No authenticated live account or actual GPU/touch session was created for QA.

Additional verification: the actual App/Three.js boat model reached Sanctuary from Palm Bay in one continuous scene after 41.9 simulated seconds, preserving XP and exposing the new shrine. No teleportation was involved in the voyage.
