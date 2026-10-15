# Sanctuary island, secret rod and world map

## Intent

Extend the published Fisch game with one new island and exactly five new fish, one per Normal, Rare, Legendary, Mythic and ??? tier. Add three rods: two cost 10,000 and 50,000 coins; a secret rod costs 100,000 coins plus one specimen of each new fish, at a hidden place and at Level 7. Replace the compass HUD with a real live map. Continue publishing only to FGadaruugan/fisch and its GitHub Pages URL.

## Decisions

- Sunken Sanctuary is a fourth island, center [1070,580], radius 225, Level 7 (3600 XP), inside the existing 4000-unit continuous sea. It has a port and navigable ruins, with jade vegetation and ancient stone arches.
- Fish: Mossfin Carp (Normal), Jade Koi (Rare), Temple Arowana (Legendary), Spirit Serpent (Mythic), Eclipse Guardian (???). Existing 25 species, saves, rarity weights and XP formula remain compatible.
- Jade Current costs 10,000 coins (control .40, luck 1.75); Temple Tide costs 50,000 (.46, 2.5). Eclipse Relic is obtained only by trade (100,000, .52, 3.5). New rods use the existing rod stat system.
- The secret shrine is at island-relative [-112,-76]. The trader can be approached on foot; interaction range is 7. It has no globally revealed map pin. Unowned Eclipse Relic is absent from the normal shop.
- The exchange consumes exactly one of each new species from Backpack, choosing the lightest specimen, and 100,000 coins. Lifetime stats, collection, XP and record fish remain. Owned rod duplicates, missing fish, insufficient funds, Level <7, wrong island and invalid/distant coordinates reject atomically.
- The server uses the existing owner-bound, idempotent command/revision transaction for `trade_rod`. The client also requires proximity before opening/submitting the secret panel. Position is client-reported, as in existing travel; this is not authoritative multiplayer movement validation.
- A live square map replaces numeric compass/arrow guidance. It shows real coast outlines, four island locations, player orientation and a dashed destination line. Clicking it opens the full map. No teleportation is added.

## Boundaries and failure handling

Canonical catalogue and pure trade rules serve Local and Supabase. Only the existing fisch-api function needs deployment; no SQL/schema/auth changes, new accounts or new dependencies. Preserve verify_jwt=false plus explicit verified-user authentication already configured in the function. Failed or retried exchanges cannot lose inventory or charge twice. Account switches retain owner-bound transport protection. Old cached HTML receives the new map dynamically.

## Verification

Test all five new rarity outcomes, Level 7 boundary, save compatibility, direct secret-purchase rejection, exchange atomicity/idempotency/concurrency, sold-versus-held requirements, invalid location, App interaction gating, actual terrain/geometry and map coordinate behavior. Run full tests, package/static/generated parity, one independent whole-branch review, CI, Edge deployment/source verification, Pages and public runtime byte checks. Actual GPU/touch verification is unavailable in this environment.
