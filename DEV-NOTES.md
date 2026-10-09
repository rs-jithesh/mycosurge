# Dev Notes

Working notes for development and QA. For player-facing facts see `GAME-DESIGN.md`, and
for the arena see `COMBAT.md`.

## Resetting & replaying

- **Top-bar Reset** (in `+layout.svelte`, shown only when the dev flag is on) clears the save
  and returns to the tutorial.
- Manual reset: remove `localStorage` keys `mycosurge_save`, `mycosurge_unlock_seen`, and
  `mycosurge_reveals`, then reload.
- **Skip intro** — the tutorial-header button (shown only when the dev flag is on) completes
  onboarding immediately. The `?skipintro` URL flag does the same for QA.
- **Skip to fight** — a second tutorial-header dev button that parks the tutorial at its
  threat handoff and drops straight into the nematode encounter.

## Developer flag

Dev features are compiled in but hidden behind a `localStorage` flag that is **off by
default**. Enable it from the browser console, then reload:

```js
localStorage.setItem('mycosurge_dev', 'true');
```

`apps/web/src/lib/stores/dev.svelte.ts` reads `mycosurge_dev === 'true'` (any other value, or
a missing key, keeps dev features off). While enabled the UI reveals: the top bar **Preview
welcome** button (opens the `WelcomeBackDialog` with a sample `OfflineReport`), the top bar
**Reset** button (clears the save), and the tutorial **Skip intro** button. Remove the key to
hide them.

## Save data

- `mycosurge_save` — serialized `GameState`, written every tick.
- `mycosurge_unlock_seen` — set once the post-tutorial "systems unlocked" overlay is
  dismissed.
- `mycosurge_reveals` — `{ announced, seen }` system ids, driving one-time unlock toasts and
  the "New" nav badge. Cleared by Reset. `?skipintro` reveals every system (QA).
- `mycosurge_dev` — `'true'` enables developer features. Off by default; see above.
- On load, the save is deep-merged over `createInitialState()` so new nested fields
  (e.g. additions to `combatStats` or `tutorialUpgrades`) survive old saves.

## Known debt / follow-ups

### Tutorial `resetAbsorbCount()`

**File:** `packages/game-engine/src/tutorial.ts`, exported from `index.ts`.

The module-level `_absorbCount` drives the opening awakening prose. `gameStore.resetGame()`
calls `resetAbsorbCount()` to replay it from the start. If the tutorial is redesigned or
made fully skippable, this counter can go.

### Tutorial-only state fields

**File:** `packages/game-engine/src/state.ts`.

`gamePhase`, `water`, `nutrients`, `mycelialNetwork`, and `tutorialUpgrades` persist in
`GameState` but are unused once `gamePhase === 'active'`. Negligible in size; could be
stripped from serialization if desired.

### Soil Nematode as a regular host

**File:** `packages/config/src/hosts.ts`.

`soil_nematode` is the tutorial encounter. Decide whether it should stay in the full-game
host list (Radar) or be hidden once `gamePhase === 'active'`.

### Tutorial defeat penalty

**File:** `packages/game-engine/src/tutorial.ts` → `applyTutorialDefeat()`.

The tutorial nematode uses a distinct three-part penalty (push hyphae back, burn a little
Biomass, halve production briefly) instead of the full game's trauma system. If the two
are unified, this function can be removed.

### Combat wiring ownership

**File:** `apps/web/src/lib/components/CombatModal.svelte`.

`completeTutorial()` and `applyTutorialDefeat()` are imported directly from the engine in
the component rather than routed through `gameStore`. Consider wrapping them for
consistency with the rest of the store API.

### Host combat AI

**Files:** `packages/game-engine/src/combat-ai.ts`, `apps/web/src/lib/pixi/radar.ts`.

Host nodes steer and fire through a pure AI module: an intent FSM (`idle → reposition →
engage`), weighted steering (arrival, orbit, wander, separation, containment), lead-aim,
and fire discipline. Profiles derive from `difficulty` and can be overridden per host via
`HostDef.ai` (`packages/config/src/hosts.ts`). Movement scales with the encounter strain's
`speedMult` through the arena `moveSpeedMult` modifier.

Tuning knobs (preferred range, move speed, turn rate, aggression, orbit ratio, fire range,
dodge lookahead/commit/cooldown/speed) live as constants in `combat-ai.ts` and are covered
by `combat-ai.test.ts`. Re-run `pnpm --filter @mycosurge/game-engine test` after any
balance change.

**Dodge phase.** Difficulty 3+ hosts (`dodgeSkill > 0`) scan incoming friendly spores for
their closest point of approach and apply a lateral avoidance force perpendicular to the
shot, blended in at priority over the base steering. A `dodgeTimer` (commit) and
`dodgeCooldown` (recovery) gate it so evasions are telegraphed sidesteps rather than
twitch. The arena passes the live spore pool as `SteeringWorld.threats` (only when
`dodgeSkill > 0`), reusing a scratch array to avoid per-frame allocation.

### Economy & upkeep

**Files:** `packages/game-engine/src/math.ts`, `economy.balance.test.ts`,
`packages/config/src/constants.ts`.

Metabolic upkeep is a reach-driven drain on Water/Nutrients (`UPKEEP_PER_REACH` per mm) —
growing the network deeper costs more to maintain. Coefficients are intentionally tunable —
`economy.balance.test.ts` runs 30-minute idle-only and upgrade-rush simulations and asserts the
maxed net lands in the target band, upkeep is a sensible share of production, and the early
single generator stays net-positive. Re-run it after any balance change.

### Offline progression — implemented

**File:** `packages/game-engine/src/offline.ts`.

The save stamps `lastSavedAt`; on load the elapsed gap (capped at 8h) is simulated at a base
50% rate, `+25%` per `Dormant Spores` level. Trauma recovery uses real time; stale contacts
expire. Tuning lives in `OFFLINE_*` constants. The result is presented by
`WelcomeBackDialog.svelte` — a centered modal that greets the player and lists the Biomass /
Water / Nutrients / Lysate change plus the offline rate.

## Verification

Run before shipping a change:

```sh
pnpm check                        # svelte-check + TS across the monorepo
pnpm lint                         # prettier
pnpm --filter @mycosurge/game-engine test
pnpm --filter web test
pnpm build
```
