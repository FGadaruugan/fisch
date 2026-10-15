# Sailing and swimming design

The user requests a controllable boat, swimming and physical travel along the map between the existing islands. The delivery target remains FGadaruugan/fisch and GitHub Pages, including its installed PWA. This changes movement and travel together; a selected map destination becomes guidance.

## Experience

- One bounded 4000-unit sea contains the existing three island centers and terrain. Walking, swimming and sailing use the same coordinates. The character enters water naturally and climbs back onto accessible shore. No drowning/stamina mechanic is added.
- A free motorboat waits alongside the current island's outer pier and can be recalled by the port worker. E or the mobile interact control boards within 8 units; the same action exits to a clear nearby shore/water point. W/S or joystick vertical controls throttle/reverse, A/D or joystick horizontal steers. The camera follows the vessel with manual orbit/zoom retained.
- Boat speed is capped at 24 units/s forward, 8 reverse, with acceleration and damping. Hull samples/substeps prevent passage through land/pier; the sea boundary prevents infinite travel. Walking stays 5.5 units/s, swimming 4 units/s.
- The map derives island and player positions from actual coordinates and shows a selected destination, bearing and distance to its coast. A compact navigation HUD shows movement mode, heading and the destination during play.
- An unlocked island becomes the saved current island only on physical approach within 24 units of its coast/pier. The existing travel service commits the checkpoint; success changes the active island/biome without recreating the scene or moving player/boat. Cloud errors leave the physical scene intact and retry after a cooldown. Level locks prevent landing on unavailable islands; navigation labels explain the lock.
- Menus, hidden tabs and pending operations freeze vessel movement. Fishing is available on accessible shore/pier and disabled while swimming/sailing. Selling remains restricted to the current island's merchant.

## Components

- `navigation.js`: CPU-only combined terrain/access/ocean model, map projection and destination bearing/distance helpers. Receives current XP and exposes global occupancy, water, hull clearance and nearby island queries.
- `boat.js`: CPU vessel state/physics, boarding/exit helpers and a procedural Three.js motorboat with wake/bob animation. No external assets/dependencies.
- `archipelago.js`: lazy full island rendering within a near radius, lightweight far silhouettes and disposal hysteresis. Reuses terrain/quality; removes decorative duplicate boats and silhouettes from individual streamed worlds.
- `voyage-scene.js`: player, boat, rig and camera coordination. Exposes `setAccess`, `setIsland`, `interact`, `getNavigation` to App, and a shared global world to Graphics.
- `app.js`: route selection and guarded asynchronous arrival; scene/service/generation checks prevent stale responses from changing a replacement scene/account.
- `ui/map.js`, `ui.js`, HTML/CSS: live coordinate marker, destination controls, context-specific interact label and navigation HUD; existing GUI settings and protected controls continue to work.

## Persistence and verification

Reuse the existing Local/Online travel command only to persist a reached island; do not change Supabase schema or backend contracts. Exact ocean coordinates and boat ownership are session state; reopening starts at the saved island's port. Server positions remain client-reported under the existing service contract.

Verify shore/water transitions, diagonal normalization, bounded time steps, hull/sea collisions, boarding/exit, route selection without travel mutation, reached-island commit without repositioning, locked land, failed/delayed arrival and menu/tab freezes. Construct/dispose actual Three.js boat and streamed worlds in CPU tests. Run the full suite, package and committed-web parity checks. Browser GPU/device sailing remains a separate real-device check.
