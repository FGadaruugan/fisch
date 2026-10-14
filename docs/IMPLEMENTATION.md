# Implementation and verification record

A playable local 3D fishing game and prepared online services, delivered on the requested GitHub repository.

- 25 species: 10 Normal / 8 Rare / 4 Legendary / 2 Mythic / 1 ???. Three large islands; Backpack, economy, progression, Profile and mobile controls.
- Graphics: local Three.js bundle, procedural models/terrain/ocean/sky, LOD/instances, light cycle, shadows/fog, adaptive quality, FPS caps and measured FPS/RAF cadence.
- 62 automated tests pass, including actual Three.js geometry and real Postgres/PGlite RLS/transaction tests.
- Syntax/import/assets/HTML and browser-bundle checks pass; static package is approximately 1.1 MB / 292 KB gzip.
- One independent whole-branch review. Concurrent finish/sale retry races and ranking-tab cache mismatch reproduced in failing tests, then fixed. No deferred review findings.
- Live Supabase smoke exits with an explicit unconfigured-project message. No cloud deployment, Auth settings or advisor results are claimed.
- Browser/GPU rendering and hardware FPS have not been verified in this environment.

## Decisions and their costs

- increase island radii from the planned 23 units to 180/165/210 with a 4000-unit ocean and distant archipelago silhouettes; terrain chunks and instanced vegetation keep draw calls controlled — directly requested large map — cost if wrong: tune terrain density and travel distances.
- use pinned npm Three.js plus an esbuild static bundle instead of committing vendor engine modules; deployment still includes all dependencies and makes no runtime CDN requests — professional modular source and reproducible builds — cost if wrong: one build step is required.
- browser shader/GPU/FPS verification remains unavailable — managed environment lacks the supported browser skill; geometry/bundle checks pass — cost if wrong: device rendering/performance faults need a browser/device pass.
- publish tested source as a reviewable GitHub branch/PR and a private playable Site — user's GitHub coding request authorizes delivery; main integration stays reviewable — cost if wrong: merge and Pages source setting remain separate steps.
- test the canonical schema with local Postgres/PGlite while cloud provisioning is pending — catches real SQL/RLS errors without modifying unrelated projects — cost if wrong: production Auth/advisors/live smoke still required.
- keep schema.sql as reproducible canonical source; Supabase CLI is unavailable, so no invented migration filename or migration-history claim — cost if wrong: generate a migration using the documented CLI flow before a later migration-managed deployment.
- bundle the pinned Supabase SDK as a local lazy esbuild chunk with license notices rather than a second vendor script — the whole browser build already bundles dependencies — cost if wrong: deployment must run npm run package.
- cloud provisioning/Auth/advisors remain a dependency — Supabase requires organization selection and explicit cost confirmation; unrelated projects stay untouched — cost if wrong: live online activation still needs project configuration and smoke checks.
- shared-world multiplayer remains outside the confirmed Friends scope — user's choice is add/list/online state — cost if wrong: a later multiplayer request needs a separate synchronization design.
- server replay of reel input remains outside the agreed elapsed-time/reward contract — current server chooses rewards and validates minimum duration; README states the limit — cost if wrong: automated clients can submit successful outcomes, so competitive rankings need stronger verification.

## Mobile viewport correction

The owner requested moving the central guidance to the bottom, enlarging the game area and placing the source on GitHub main. Guidance now occupies a bottom footer with space above for touch controls; mobile play uses a compact HUD. Play requests fullscreen on touch devices and the explicit fullscreen/exit button remains available. Browser denial preserves normal play. Fullscreen request timing, rejection/retry and Back/exit synchronization have automated coverage. On-device fullscreen and final CSS layout still need a device check.

The original game PR was merged into main at the owner's request; the previous reviewable-branch delivery decision is superseded.

## GitHub Pages runtime correction

A real HTTP check found that the branch-based Jekyll publisher served the modular source entry with unresolved bare imports, while the Actions publisher served the bundle. The root entry now loads a committed, generated web/ runtime; both publishing paths serve the same game. Static checks reject unresolved runtime package imports, and CI rebuilds and checks the committed runtime. Changes to application source require npm run package and committing web/ together. This uses repository content without requiring new Pages administration permissions.
