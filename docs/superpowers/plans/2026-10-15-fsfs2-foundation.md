# FSFS 2 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Preserve existing Fisch progress when loading unsupported or damaged saves and provide bounded local backup recovery.

**Architecture:** Add a persistence boundary around the existing v1 snapshot. Keep game rules, server contracts, and favorites independent. Local service exposes persistence status so account import cannot silently import an incompatible save.

**Tech Stack:** JavaScript ES modules, localStorage-compatible adapter, node:test, existing esbuild build.

**Spec:** ../specs/2026-10-15-fsfs2-foundation-design.md

## Global Constraints

- snapshot.version=1; existing fisch3d.save.v1 key remains unchanged.
- FSFS 2 product version is independent of save schema version.
- Preserve valid fish IDs, weight, dates, coins, XP, rods, collection, record and island.
- No live Supabase schema, Auth provider or Mini-3Dgame changes.
- Keep local/online favorite owner keys and Sell All protection.
- Mongolian player-facing notices; no raw JSON, SQL, tokens or internal keys in UI.
- Browser-local backups cannot survive clearing browser data.
- Rebuild and commit web runtime with implementation changes.

## Review Focus

- A future-version save appearing after startup must not be overwritten; Task 1 checks storage again before writing.
- Another tab changing the primary must not be overwritten by a stale session; Task 1 treats raw-value mismatch as a conflict.
- Backup/quarantine quota failures must preserve both original primary and last good backup; Task 1 fault injection.
- Unsupported or damaged backup must not be normalized into a false successful recovery; Task 1 classification tests.
- Switching to online while local persistence is blocked must remain possible; Task 3 import/login boundary tests.

## Task 1: Persistence boundary and recovery

**Files:** Create js/storage.js, tests/storage.test.js.

**Interfaces:**
- Consumes SAVE_KEY, createInitialState(), normalizeState() from js/save.js.
- Produces createSaveStorage({storage,onError}) returning load(), write(snapshot), getStatus().
- load() returns a normalized v1 snapshot without mutating existing storage.
- getStatus() returns {kind,writable,canImport}; kind is missing, supported, damaged, unsupported, unavailable, recovered, conflict.
- write(snapshot) returns boolean; callback emits SAVE_UNAVAILABLE, SAVE_RECOVERED, SAVE_INCOMPATIBLE or SAVE_CONFLICT.
- Keys: SAVE_KEY+'.backup' and SAVE_KEY+'.recovery'; one slot each.

- [x] Write failing tests using memoryStorage and a fault-injecting adapter. Pin these assertions:
  - Valid populated v1: deepEqual(load(),normalizeState(original)); first write stores original raw primary in backup.
  - Future version 2: canImport=false, writable=false; write returns false; primary raw string unchanged.
  - Malformed primary plus valid backup: returns normalized backup; emits SAVE_RECOVERED; next successful write preserves malformed raw in recovery.
  - Missing primary plus valid backup: restores backup rather than starts a new profile.
  - Unsupported backup: never treated as a usable v1 backup, never overwritten by automatic recovery.
  - Quarantine write failure: primary and backup remain byte-for-byte unchanged.
  - Backup write failure: primary unchanged; write returns false.
  - Primary write failure: previous good primary and backup still readable.
  - Two writers: after A writes, stale B returns false and preserves A's raw primary.
  - Runtime primary replaced by version 2: write returns false and leaves new primary intact.
  - Unavailable storage: initial session state loads, writable=false, no uncaught exception.
- [x] Run node --test tests/storage.test.js and confirm missing behavior fails.
- [x] Implement createSaveStorage with raw-value comparison before writes. Classify object/version before normalization; unknown versions never pass through normalizeState as recovery. Preserve damaged raw before overwriting; do not overwrite an occupied different recovery slot. A protected recovery slot causes session-only fallback. Keep last observed primary after successful writes. On conflict block further writes and import until reload.
- [x] Run node --test tests/storage.test.js; all cases pass.
- [x] Commit persistence boundary and tests.

## Task 2: Local service integration and messages

**Files:** Modify js/services/local.js, js/errors.js, tests/service.test.js.

**Interfaces:**
- Consumes createSaveStorage from Task 1.
- Produces service.getPersistenceStatus(), returning the boundary status.
- Mutations and startCast reject SAVE_INCOMPATIBLE for unsupported snapshots and SAVE_CONFLICT after cross-tab conflict. Storage-unavailable sessions may continue in memory with a notice.
- Persistence occurs after a valid game-rule mutation; failed disk writes never produce a false durable-save claim.

- [x] Add service tests: populated v1 reload retains all values; version 2 profile update and startCast reject while raw primary remains identical; corrupted primary restores valid backup; quota failures permit in-memory play without changing old disk progress; retry receipt still prevents duplicate rewards.
- [x] Run node --test tests/service.test.js and confirm new assertions fail.
- [x] Replace inline localStorage parsing/writing with the storage boundary. Gate before changing tickets or applying mutations. Keep subscribers and operation cache behavior. Expose getPersistenceStatus().
- [x] Add exact messages: SAVE_INCOMPATIBLE: 'Энэ ахиц тоглоомын шинэ хувилбараар хадгалагдсан байна. Тоглоомоо шинэчлээд дахин нээгээрэй.' SAVE_CONFLICT: 'Өөр цонхонд ахиц өөрчлөгдсөн байна. Үргэлжлүүлэхийн өмнө тоглоомоо дахин нээгээрэй.' Retain existing SAVE_UNAVAILABLE and use SAVE_RECOVERED only for genuine successful recovery.
- [x] Run node --test tests/storage.test.js tests/service.test.js tests/save.test.js tests/app.test.js.
- [x] Commit local-service integration and tests.

## Task 3: Account import boundary and compatibility

**Files:** Create js/local-import.js, tests/local-import.test.js; modify js/main.js and README.md. Modify js/ui/profile.js only if existing null-local handling does not hide the import preview.

**Interfaces:**
- Consumes service.getSnapshot(), getPersistenceStatus().
- Produces getImportableLocalSnapshot(service): returns snapshot if canImport, otherwise null. This is a pure gate, not a cloud import function.
- Both account preview and account_import command use the same gate; command rejects IMPORT_UNAVAILABLE on null.

- [x] Add tests: supported populated snapshot returned without mutation; unsupported/conflict/unavailable local status yields null even if session has XP; a supported in-memory snapshot cannot override canImport=false; favorites remain separate and unchanged.
- [x] Run node --test tests/local-import.test.js; confirm failures before implementation.
- [x] Implement helper and integrate into syncAccountView and account_import. Keep Google sign-in, verified user check, account switching, and online bootstrap independent of local import eligibility.
- [x] Run helper, account, app and online adapter tests. Inspect main.js call sites to verify login is not gated by local canImport.
- [x] Update README with actual backup/recovery behavior, browser-local limit, incompatibility handling and reload requirement after a cross-tab conflict. Do not advertise all FSFS 2 roadmap features as shipped.
- [x] Commit import gate, documentation and tests.

## Task 4: Verification and deliverable

**Files:** Generated web/ runtime plus task files above.

- [x] Run npm test; require the full suite to pass, with original 130 tests retained.
- [x] Run npm run build, npm run check, git diff --check; require exit code 0.
- [ ] If a browser runtime is available, test local save reload, recovery notice, Google login reachability, Backpack favorite toggle and Sell All. Do not use real user saves as test fixtures. Record unavailable browser verification explicitly.
- [x] Request whole-branch code review with spec and plan. Address correctness issues and rerun affected tests; rerun full suite after production changes.
- [x] Commit matching source and web bundle. Push feature branch and create a reviewable PR with baseline, tests and storage limitations.
- [ ] Integrate/publish only within authorized scope; after publication inspect the live bundle and deployment status. Never describe this first phase as the complete FSFS 2 rework.

## Self-review

All first-phase spec requirements map to Tasks 1–4. The roadmap's graphics, UI redesign,
weather, fishing, quests and cloud favorites are later stages. No dependency upgrades,
schema migration, live data modification or extra subsystem is required for this phase.


## Execution evidence · 2026-10-16

Tasks 1–3 implemented. Whole-branch independent review completed; notice semantics
and strict backup validation tightened with failing-then-passing regression tests.
Backup core fields must agree with normalized v1; partially salvageable backups are
kept intact rather than automatically treated as successfully recovered. Primary v1
normalization remains compatible with existing behavior.

Local storage comparison detects already committed changes but is not an atomic
cross-tab lock. Browser smoke could not run because no Chromium binary is installed.
The cloud skill's task scripts had no local executable paths; the task ledger and
verification commands were recorded manually. No deferred minor findings.
