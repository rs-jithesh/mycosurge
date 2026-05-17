# Dev Notes — Pre-Production Cleanup

## Remove Before Shipping

### 1. `> EXE: PURGE` button — hard game reset

**File:** `apps/web/src/lib/components/Sidebar.svelte` (lines 18–21, 32)

The `handlePurge()` function wipes `localStorage` and restarts from the tutorial. It's gated behind a `confirm()` dialog but should be removed for production — players should never accidentally lose progress.

Remove:

- The `handlePurge` function (lines 18–21)
- The `onclick={handlePurge}` binding on the button (line 32)
- Optionally keep the button as a disabled easter egg, or remove entirely

### 2. Tutorial `resetAbsorbCount()` export

**File:** `packages/game-engine/src/tutorial.ts` (line 8) and `packages/game-engine/src/index.ts`

The `resetAbsorbCount()` module-level counter is used by `gameStore.resetGame()` to replay the tutorial awakening prose from the start. If the tutorial is ever made skippable or replaced, this can be removed.

### 3. Tutorial phases — threshold tuning

The phase transitions are hardcoded:

- Phase 1→2: 10 Water, 10 Nutrients
- Phase 2→3: any automation upgrade purchased (2 Biomass)
- Phase 3→4: Mycelial Network ≥ 5mm

These are balanced for a ~2-minute tutorial loop. Adjust if playtesting shows the intro drags or rushes.

### 4. Soil Nematode host

**File:** `packages/config/src/hosts.ts`

Added as the first host entry (`id: 'soil_nematode'`) for the Phase 4 tutorial encounter. It has difficulty 1 and a `slow_spiral` attack pattern. Consider whether it should remain as a regular farmable host after the tutorial, or be hidden once `gamePhase === 'active'`.

### 5. Tutorial state fields in GameState

**File:** `packages/game-engine/src/state.ts`

`gamePhase`, `water`, `nutrients`, `mycelialNetwork`, and `tutorialUpgrades` are part of the persisted `GameState` but are unused once `gamePhase === 'active'`. They take negligible space but could be stripped from serialization if desired.

### 6. Blinking border on nematode row

**File:** `apps/web/src/routes/radar/+page.svelte`

The nematode host row uses a JS `setInterval` toggling a `blink-border` CSS class (outline: 2px solid white) every 600ms. This intentionally violates the design system's `animation: none !important` rule — it's a gameplay cue, not decoration. Remove or replace when the tutorial is finalized.

### 7. `applyTutorialDefeat()` — 3-part penalty

**File:** `packages/game-engine/src/tutorial.ts`

Called on tutorial nematode defeat:

- `mycelialNetwork -= 2` (min 0)
- `biomass = floor(biomass * 0.9)` (10% burn)
- `tutorialShockTimer = 60` (halves W/N gen for 60s)

This replaces `enterTrauma()` for the tutorial encounter. If the penalty system is ever unified with the full game's trauma system, this function can be removed.

### 8. CombatModal after-action report branching

**File:** `apps/web/src/lib/components/CombatModal.svelte`

The modal branches on `wasTutorial` (captured from `gamePhase` on mount):

- Tutorial victory: shows rewards summary + [RETREAT], calls `completeTutorial()`
- Tutorial defeat: shows penalties summary + [RETREAT], calls `applyTutorialDefeat()`
- Normal victory/defeat: existing behaviour with minimal reward display

The `completeTutorial()` and `applyTutorialDefeat()` imports are direct engine imports in the component — not routed through the game store.

### 9. /radar page — 3-state routing

**File:** `apps/web/src/routes/radar/+page.svelte`

The radar page now has 3 states based on `gamePhase`:

1. Early tutorial (`awakening`/`manager`/`explorer`): "RADAR OFFLINE" message
2. Tutorial scan (`tactician`): single nematode row + blink border + scan cost indicator
3. Full game (`active`): existing host list

If the tutorial is ever removed or made skippable, the first two states can be deleted.
