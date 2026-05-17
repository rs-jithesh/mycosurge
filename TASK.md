# MycoSurge Implementation — Task List

Status legend: `[ ]` pending, `[~]` in progress, `[x]` completed

---

## Phase A — Foundation: Seamless Tutorial + Permanent Resources

### A1. Streamline tutorial phases
- [x] Merge `awakening` + `manager` into single intro phase
- [x] Remove resource zeroing in `completeTutorial()`
- [x] Persist Osmotic Pump / Enzymatic Exudates as permanent generators
- [x] Transition to `active` phase without hard reset

### A2. Permanent resource depletion
- [x] Add Water/Nutrient depletion rates to constants
- [x] Add depletion tick to `tickIdle()`
- [x] Add `waterCap` and `nutrientsCap` to GameState

### A3. Combat yield processing thresholds
- [x] Implement `getCombatYieldMultiplier(state)` returning 1.0 / 0.5 / 0.15 / 0
- [x] Wire into `calculateVictoryReward()`
- [x] Add threshold constants

### A4. Dynamic Core page UI
- [x] Replace inline ASCII bars with `<AsciiBar>` component
- [x] Drive `res-critical` class dynamically from threshold check
- [x] Compute status text dynamically (not hardcoded)
- [x] Run `pnpm --filter web check` — fix any errors

---

## Phase B — Generators

### B1. Generator config & state
- [x] Define generator type (id, name, baseRate, cost, maxLevel)
- [x] Add `generators` map to GameState
- [x] Define initial generators (Osmotic Pump, Enzymatic Exudates)

### B2. Generator tick
- [x] Add generator production to `tickIdle()`
- [x] Apply before depletion so player sees net delta

### B3. Generator UI
- [x] Add generator panel to Core page
- [x] Wire `> SYS: GENERATORS` to navigate to evolution page
- [x] Run `pnpm --filter web check` — fix any errors

---

## Phase C — Lysate & Combat Yield

### C1. Lysate state & production
- [x] Add `lysateRaw` and `lysateBanked` to GameState
- [x] Reward Lysate on combat victory

### C2. Auto-stabilization & decay
- [x] Each tick: convert raw→banked using Water/Nutrients
- [x] Decay raw Lysate if insufficient resources
- [x] Add constants for rates/costs

### C3. Cap expansion
- [x] Implement `expandWaterCap()`, `expandNutrientCap()`, `expandBiomassCap()`
- [x] Add cap fields to GameState

### C4. Lysate display
- [x] Show Lysate on Core page with decay indicator
- [x] Add cap expansion buttons
- [x] Run `pnpm --filter web check` — fix any errors

---

## Phase D — Upgrades on /evolution

### D1. Upgrade config
- [x] Define 8 economy upgrades (MYCELIAL NETWORK + STRUCTURAL)
- [x] Add 4 INCURSION PROTOCOLS placeholders (to be designed)
- [x] Add costs, prereqs, effects

### D2. Upgrade engine
- [x] Purchase & validation logic
- [x] Wire into store

### D3. Evolution page rebuild
- [x] NEURAL MUTATIONS section (skill tree purchase UI)
- [x] ECONOMY UPGRADES section (3 categories, terminal style)
- [x] Locked upgrades show prerequisite chain
- [x] Run `pnpm --filter web check` — fix any errors

---

## Phase E — Remaining UI Polish

### E1. Skill tree purchase UI
- [x] Visual tree on /evolution
- [x] Click-to-purchase, prerequisite highlighting
- [x] Cost display

### E2. Wire action buttons
- [x] `> SYS: SCAN` → /radar
- [x] `> SYS: UPGRADES` → /evolution

### E3. Clean up dead code
- [x] Remove tutorial reset logic no longer needed

---

## Verification

- [x] Run `pnpm --filter web check` after each phase
- [x] Run `pnpm check` (full repo type check)
- [x] Run `pnpm lint`
- [x] Run tests: `cd packages/game-engine && npx vitest run`
- [x] Run `pnpm build` (full Turbo build)

---

## Phase B — Generators

### B1. Generator config & state

- [ ] Define generator type (id, name, baseRate, cost, maxLevel)
- [ ] Add `generators` map to GameState
- [ ] Define initial generators (Osmotic Pump, Enzymatic Exudates)

### B2. Generator tick

- [ ] Add generator production to `tickIdle()`
- [ ] Apply before depletion so player sees net delta

### B3. Generator UI

- [ ] Add generator panel to Core page
- [ ] Wire `> SYS: GENERATORS` to scroll/navigate to panel
- [ ] Run `pnpm --filter web check` — fix any errors

---

## Phase C — Lysate & Combat Yield

### C1. Lysate state & production

- [ ] Add `lysateRaw` and `lysateBanked` to GameState
- [ ] Reward Lysate on combat victory

### C2. Auto-stabilization & decay

- [ ] Each tick: convert raw→banked using Water/Nutrients
- [ ] Decay raw Lysate if insufficient resources
- [ ] Add constants for rates/costs

### C3. Cap expansion

- [ ] Implement `expandWaterCap()`, `expandNutrientCap()`, `expandBiomassCap()`
- [ ] Add cap fields to GameState

### C4. Lysate display

- [ ] Show Lysate on Core page with decay indicator
- [ ] Run `pnpm --filter web check` — fix any errors

---

## Phase D — Upgrades on /evolution

### D1. Upgrade config

- [ ] Define 8 economy upgrades (MYCELIAL NETWORK + STRUCTURAL)
- [ ] Fill INCURSION PROTOCOLS (4 combat upgrades — design needed)
- [ ] Add costs, prereqs, effects

### D2. Upgrade engine

- [ ] Purchase & validation logic
- [ ] Wire effects into game math

### D3. Evolution page rebuild

- [ ] NEURAL MUTATIONS section (skill tree purchase UI)
- [ ] ECONOMY UPGRADES section (3 categories, terminal style)
- [ ] Locked upgrades show prerequisite chain
- [ ] Run `pnpm --filter web check` — fix any errors

---

## Phase E — Remaining UI Polish

### E1. Skill tree purchase UI

- [ ] Visual tree on /evolution
- [ ] Click-to-purchase, prerequisite highlighting
- [ ] Cost display

### E2. Expedition UI

- [ ] Host selector + Launch button
- [ ] Collect button on completed expeditions

### E3. Wire action buttons

- [ ] `> SYS: SCAN` → /radar
- [ ] `> SYS: GENERATORS` → scroll to generator panel
- [ ] `> SYS: UPGRADES` → /evolution

### E4. Clean up dead code

- [ ] Remove tutorial reset logic no longer needed

---

## Verification

- [ ] Run `pnpm --filter web check` after each phase
- [ ] Run `pnpm check` (full repo type check)
- [ ] Run `pnpm lint`
- [ ] Run tests: `cd packages/game-engine && npx vitest run`
- [ ] Run tests: `cd apps/web && npx vitest run`
- [ ] Run `pnpm build` (full Turbo build)
