# Dev Notes

Working notes for development and QA. For player-facing facts see `GAME-DESIGN.md`, and
for the arena see `COMBAT.md`.

## Resetting & replaying

- **Top-bar Reset** (in `+layout.svelte`) clears the save and returns to the tutorial.
- Manual reset: remove `localStorage` keys `mycosurge_save` and `mycosurge_unlock_seen`,
  then reload.
- **Skip intro** — the button in the tutorial header completes onboarding immediately.
  The `?skipintro` URL flag does the same for QA.

## Save data

- `mycosurge_save` — serialized `GameState`, written every tick.
- `mycosurge_unlock_seen` — set once the post-tutorial "systems unlocked" overlay is
  dismissed.
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

### Offline progression

**File:** `apps/web/src/lib/stores/game.svelte.ts`.

`Dormant Spores` describes offline progress, but the tick loop only runs while the tab is
open; there is no catch-up on load. Either implement offline accrual or adjust the upgrade
copy.

## Verification

Run before shipping a change:

```sh
pnpm check                        # svelte-check + TS across the monorepo
pnpm lint                         # prettier
pnpm --filter @mycosurge/game-engine test
pnpm --filter web test
pnpm build
```
