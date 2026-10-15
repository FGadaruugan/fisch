# Implementation and verification record

A playable local and account-based 3D fishing game, delivered on the requested GitHub repository.

## Physical sailing and swimming — 2026-10-15

All three canonical island coordinates now share a bounded global terrain/navigation model. The character can walk into water, swim and climb onto shore; locked land and building collisions remain enforced. A procedural motorboat supports acceleration/reverse, steering, hull clearance/substeps, boarding and safe shore/water exit. The existing port worker recalls the free session boat to the current port. Menus, tab visibility and outstanding game actions freeze vessel movement.

Map buttons select a destination without mutating the saved island or recreating the scene. Actual approach triggers the existing service travel command as an arrival checkpoint. Scene/service identity guards discard stale completions; an owned busy lease releases when accounts change, and opening a menu cannot invalidate a legitimate reached-island update. Failed arrival preserves coordinates and retries after five active seconds. The server protocol and schema are unchanged; location remains client-reported, and exact ocean coordinates/vessel are session state. Reload/login starts at the last saved port.

Detailed island visuals load near the player and release with distance hysteresis; far silhouettes remain visible. One shared ocean, camera and player persist throughout a trip. The map and navigation HUD derive live positions, bearings and coast distances from the same coordinate model. Cached older HTML receives a missing navigation HUD dynamically.

Verification covers swim/shore transitions, speed/frame bounds, hull/boundary collisions, safe exits, level locks, route-only selection, preserved arrival coordinates, failed/delayed arrival and account/menu races, camera-relative movement and real Three.js geometry/disposal. An integrated CPU simulation boards the actual boat, pauses through the map and physically sails around Palm Bay to Coral before saving arrival in the same scene. Device/GPU rendering, touch sailing feel and actual sailing FPS remain device QA items.

## Installable app — 2026-10-15

The approved app-like direction is implemented as standalone PWA metadata and an install control inside the existing Settings flow. The manifest keeps id, scope and start_url at the same /fisch/ base for both Pages publishers. Both HTML pages reference the shared manifest; the static packager copies it alongside opaque 192/512 PNG icons and a 180 PNG Apple touch icon. The fish mark comes from the existing project favicon, with its complete silhouette inside the maskable safe circle. The editable SVG source is committed.

The install controller captures beforeinstallprompt without opening it automatically, calls prompt synchronously in the initiating command, consumes each offer once, coalesces repeated taps, handles rejection/dismissal and permits a fresh offer. It supports both modern prompt results and older userChoice promises. Only appinstalled or an observed standalone display signal establishes app state. Standalone launch evidence persists within the page when the existing Play action enters fullscreen; ordinary browser fullscreen does not establish app state. Absence of an offer exposes Android/iOS/desktop guidance rather than asserting lack of device support. Settings updates the existing card without recreating its focused controls; installation state owns its own busy flag. Controller listeners are released on disposal.

This increment adds no service worker or offline claim. Static assets retain ordinary deployment caching, and Auth/API requests keep their existing behavior. Browser/device installation and standalone Google popup behavior require a real device check; automated coverage verifies prompt timing, offer lifecycle, fallback, display signals and cleanup. The build check validates manifest scope and actual PNG dimensions.

References: [installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [gesture-bound one-shot prompt](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt), [install lifecycle](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [Android Chrome installation](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en).

## Device support — 2026-10-15

Settings and graphics-failure UI expose support for the actual WebGL 2 context, fullscreen, Web Audio API, detected touch/pointer input, and Local storage availability. Statuses distinguish supported, unavailable/blocked, and unknown. Context loss or an unverified WebGL constructor never imply unsupported hardware. Storage uses a unique temporary key, restores an existing collision, and treats quota exhaustion as uncertain. It neither requests fullscreen nor starts audio nor creates extra GPU contexts. The refresh action remains available during other work and is usable before App startup.

Fullscreen control and its report share one permission-aware detector. Live FPS, RAF and Quality text refresh together; no physical display support or achievable frame rate is inferred. The error screen is scrollable and keeps keyboard focus within its retry/diagnostics controls. This remains a client-only GitHub Pages change.

API references: [fullscreenEnabled](https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenEnabled), [storage availability](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API), [maxTouchPoints](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/maxTouchPoints), [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). WebGL 2 context and capability fields were checked against the pinned Three.js 0.186.0 implementation.

## Profile and specimen details — 2026-10-15

The active delivery target is FGadaruugan/fisch and its GitHub Pages game. Profile reads lifetime rarity counts and its saved personal-best price even after sale, and derives island access from canonical XP thresholds. Backpack cards use native details/summary disclosures with actual specimen name, kg, rarity, value, island and local catch date; unknown legacy dates are labeled unavailable. Selling remains a separate action. Open specimens and summary focus survive snapshot refresh, and summaries participate in the existing modal keyboard focus trap. The save/API contracts are unchanged.

Profile also displays its equipped-rod Luck and normalized rarity selection odds for the current island. Unavailable tiers stay at zero; the rare-tier multiplier is applied before normalization, matching the existing sampler. These percentages describe selection; reel control determines capture success. New information panels use responsive layouts; actual hardware FPS still requires a device pass.

## Selectable GUI — 2026-10-15

Settings exposes eight informational overlays with ON/OFF switches and a GUI-only restore action. All new preferences default ON and survive the existing versioned settings reload; the prior FPS preference is retained. Navigation, interactive controls, fishing feedback and critical notices are not optional. The visibility layer also refuses to hide a marked element containing controls. It uses a separate attribute so toggling a timed catch notice cannot reopen an expired notice or change normal lobby/play/fishing visibility. No account or gameplay data is changed.

- 25 species: 10 Normal / 8 Rare / 4 Legendary / 2 Mythic / 1 ???. Three large islands; Backpack, economy, progression, Profile and mobile controls.
- Graphics: local Three.js bundle, procedural models/terrain/ocean/sky, LOD/instances, light cycle, shadows/fog, adaptive quality, FPS caps and measured FPS/RAF cadence.
- 74 automated tests pass, including actual Three.js geometry and real Postgres/PGlite RLS/transaction tests.
- Syntax/import/assets/HTML and browser-bundle checks pass; static package is approximately 1.1 MB / 298 KB gzip (15 static files).
- One independent whole-branch review. Concurrent finish/sale retry races and ranking-tab cache mismatch reproduced in failing tests, then fixed. No deferred review findings.
- Shared Supabase backend deployed to the owner-selected Mini-3Dgame project. Live transaction rollback and HTTP auth/CORS checks passed; existing Mini-3Dgame data/functions/triggers matched the pre-change baseline. Google browser login still requires device verification.
- Browser/GPU rendering and hardware FPS have not been verified in this environment.

## Decisions and their costs

- increase island radii from the planned 23 units to 180/165/210 with a 4000-unit ocean and distant archipelago silhouettes; terrain chunks and instanced vegetation keep draw calls controlled — directly requested large map — cost if wrong: tune terrain density and travel distances.
- use pinned npm Three.js plus an esbuild static bundle instead of committing vendor engine modules; deployment still includes all dependencies and makes no runtime CDN requests — professional modular source and reproducible builds — cost if wrong: one build step is required.
- browser shader/GPU/FPS verification remains unavailable — managed environment lacks the supported browser skill; geometry/bundle checks pass — cost if wrong: device rendering/performance faults need a browser/device pass.
- publish tested source as a reviewable GitHub branch/PR and a private playable Site — user's GitHub coding request authorizes delivery; main integration stays reviewable — cost if wrong: merge and Pages source setting remain separate steps.
- test the canonical schema with local Postgres/PGlite while cloud provisioning is pending — catches real SQL/RLS errors without modifying unrelated projects — cost if wrong: production Auth/advisors/live smoke still required.
- keep schema.sql as canonical source and apply the native fisch_account_progress migration to the selected project; no invented local timestamp filename — cost if wrong: use the recorded native migration for future schema evolution.
- bundle the pinned Supabase SDK as a local lazy esbuild chunk with license notices rather than a second vendor script — the whole browser build already bundles dependencies — cost if wrong: deployment must run npm run package.
- reuse the owner-selected Mini-3Dgame project and Google Auth with fisch_ tables/functions — explicitly requested sharing supersedes the earlier dedicated-project assumption — cost if wrong: both games share infrastructure limits and Auth account lifecycle.
- shared-world multiplayer remains outside the confirmed Friends scope — user's choice is add/list/online state — cost if wrong: a later multiplayer request needs a separate synchronization design.
- server replay of reel input remains outside the agreed elapsed-time/reward contract — current server chooses rewards and validates minimum duration; README states the limit — cost if wrong: automated clients can submit successful outcomes, so competitive rankings need stronger verification.

## Mobile viewport correction

The owner requested moving the central guidance to the bottom, enlarging the game area and placing the source on GitHub main. Guidance now occupies a bottom footer with space above for touch controls; mobile play uses a compact HUD. Play requests fullscreen on touch devices and the explicit fullscreen/exit button remains available. Browser denial preserves normal play. Fullscreen request timing, rejection/retry and Back/exit synchronization have automated coverage. On-device fullscreen and final CSS layout still need a device check.

The original game PR was merged into main at the owner's request; the previous reviewable-branch delivery decision is superseded.

## GitHub Pages runtime correction

A real HTTP check found that the branch-based Jekyll publisher served the modular source entry with unresolved bare imports, while the Actions publisher served the bundle. The root entry now loads a committed, generated web/ runtime; both publishing paths serve the same game. Static checks reject unresolved runtime package imports, and CI rebuilds and checks the committed runtime. Changes to application source require npm run package and committing web/ together. This uses repository content without requiring new Pages administration permissions.


## Shared account progress — 2026-10-14

The user explicitly selected the existing Mini-3Dgame Supabase project for Fisch. This supersedes the earlier dedicated-project assumption. Reuse its Google identities, keep all game tables/functions under fisch_, and preserve existing Mini-3Dgame schema, records and Auth configuration. No new project or cost confirmation is needed for provisioning a separate namespace in the selected project.

Profile gains Google login, verified session restore, refresh/sign-out and a reviewed Local progress preview. The canonical GitHub callback keeps OAuth on the existing Auth Site URL origin and returns a session only to a bound opener/source/origin/nonce. No Google provider token is forwarded. The local save is copied, never removed. Only a pristine cloud revision can import, with an atomic per-owner row lock and operation receipt; imports cannot overwrite or merge an account already played elsewhere.

Private snapshot progression includes imported XP/coin/collection; Top starts from server-earned rewards. Subsequent catch scores are incremental, so imported personal-best weight cannot poison later ranked catches. All cloud gameplay reuses the existing server-owned GameService and transactional receipts.

Verification: 74 tests currently pass, including RED-to-GREEN popup/identity/import/request-size cases; native deployment and live checks are recorded after publication. Google account selection and GPU rendering require a real browser/device.

Backend publication verified: native migration fisch_account_progress applied to ozbcmjcawpnbxfnkvscd; fisch-api v1 ACTIVE, source ezbr SHA256 94ae6e0d4bcba509360cf83485169f1980113446c6124a9d234536a2758b2b0c. Live Postgres rollback QA passed import preservation, no overwrite, same-operation retry, server-only Top, owned RLS and denied client writes; no test profiles remained. Both allowed-origin preflights and unauthenticated/invalid-token denials were checked.

Independent review reproduced and fixed four account transition defects: stale OAuth identity on error, disposed request retries into another identity, lazy connection identity races, and a null-service continuation after signout. Added current-fragment session matching, synchronous identity generation guards, serialized connection setup, owner-bound explicit JWT/header transport and cancellation, and validated App service switches. Mini-3Dgame users/records and hashes of existing functions/triggers matched the pre-change baseline. Advisors report only intentional backend-only RLS tables without client policies and unused fresh indexes for Fisch.
