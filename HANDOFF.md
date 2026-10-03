# Mycosurge — Handoff

Status: **in active development.** Everything below reflects the current working tree.
The repo is a normal git history (several feature commits); the working tree is clean.

Purpose: a self-contained brief so a reviewer/agent can understand the game, its current
state, and where everything lives without reading the whole codebase.

---

## 1. TL;DR

Mycosurge is a browser **idle / bullet-hell / RPG hybrid**. You grow a sentient fungal
network: harvest Water + Nutrients, synthesise Biomass, automate with generators, fight
hosts in a Pixi.js arena for Lysate, and spend Lysate to raise caps. The UI is a
"Bio-Luminal Lab" instrument panel.

**Most recent work:** mutations now spend a limited **genome-point budget** (base 6 + 2 per echo,
`+3` from Experimental DNA) instead of Biomass, prerequisites unlock at level 1, and a **Respec**
(free once) recomputes derived effects — so builds diverge and no purchasable node is inert. See
§12.

---

## 2. Repo layout

```
mycosurge/
├── apps/web/                 # SvelteKit 5 SPA (ssr=false, prerender=true)
│   └── src/
│       ├── app.css           # font import + @import '@mycosurge/design-system'
│       ├── lib/
│       │   ├── components/   # Overlay, CombatModal, TutorialIntro, ActivityLog,
│       │   │                 #   GrowthCycleWheel, CycleCore, ResourcePanel, PhaseDetailPanel, …
│       │   │   ├── hunt/      # HuntSection — sonar contacts + tutorial scan flow
│       │   │   └── panels/    # EvolutionPanel, ExpeditionsPanel (drawers)
│       │   ├── content/      # onboarding.ts (tutorial steps), phases.ts (growth-cycle meta)
│       │   ├── pixi/         # Pixi.js v8 arena engine (radar.ts, constants.ts)
│       │   └── stores/       # game.svelte.ts, log.svelte.ts, ui.svelte.ts (overlay stack)
│       └── routes/           # / (Core) only — systems open as overlays, not routes
├── packages/
│   ├── config/               # pure TS: constants, hosts, generators, strains, skills
│   ├── game-engine/          # pure TS: combat, expeditions, math, radar, manual, phase, skills
│   └── design-system/        # CSS tokens + @theme block (no build step)
└── docs: AGENTS.md, DESIGN.md, GAME-DESIGN.md, COMBAT.md, DEV-NOTES.md,
         UI-REVAMP-PLAN.md, RADAR-ECONOMY-PLAN.md, GROWTH-CYCLE-LAYOUT-PLAN.md
```

Build order (Turbo): `config → game-engine → design-system → web`. All packages are ESM.

---

## 3. Tech stack & commands

- **SvelteKit 5** + **Svelte 5 runes** (`$state`, `$derived`, `$props`, `$effect`) — _not_ Svelte 4.
- **TypeScript**, **Pixi.js v8**, **Tailwind CSS v4** (CSS-first `@theme` in `tokens.css`; no
  `tailwind.config.js`).
- **Vitest** (glob `src/**/*.{test,spec}.{js,ts}`), **Prettier** (`semi`, `singleQuote`,
  `tabWidth 2`, `printWidth 100`), **pnpm 10 + Turbo**.

```sh
pnpm dev                              # all dev servers (Turbo)
pnpm build                            # build all packages + app
pnpm lint                             # prettier check
pnpm check                             # svelte-check + TS across the monorepo
pnpm --filter @mycosurge/game-engine test
pnpm --filter web test
```

Focused: `cd apps/web && npx vitest run` · `cd packages/game-engine && npx vitest run`.

---

## 4. Game state

`GameState` (`packages/game-engine/src/state.ts`) is the single source of truth, held in a
module-level `$state` inside `apps/web/src/lib/stores/game.svelte.ts` and **auto-saved to
`localStorage` every tick** under `mycosurge_save`. On load it is deep-merged over
`createInitialState()` so new fields survive old saves.

Key fields: `gamePhase`, `water`/`waterCap`, `nutrients`/`nutrientsCap`, `biomass`/`maxBiomass`,
`baseBiomassPerSec`, `lysateRaw`/`lysateBanked`, `generators{}`, `upgradeLevels{}` (legacy, no
longer read), `skillAllocations{}`, `hostAssimilation{}`, `assimilationPercent`, `alertLevel`,
`isInTrauma`,
`traumaTimer`, `combatStats{}`, `contacts[]`, `expeditions[]`, `acquiredEchoes[]`,
`hostsDefeated`, `totalBiomassEarned`, `manualCooldown`, `tutorialUpgrades{}`.

`gamePhase`: `awakening → manager → explorer → tactician → active`. The full game (sidebar,
Evolution, Expeditions, the Growth Cycle) is gated on `gamePhase === 'active'`.

---

## 5. Core systems

### Resources

| Resource      | Behaviour                         | Role                           |
| ------------- | --------------------------------- | ------------------------------ |
| **Water**     | passive drain; made by generators | gating resource                |
| **Nutrients** | passive drain; made by generators | digestion gate                 |
| **Biomass**   | accumulates + combat rewards      | currency (generators, respecs) |
| **Lysate**    | combat only; perishable           | spent to expand caps           |

Each pool has a cap. Rewards arriving above a cap are **kept** (never silently deleted).

### Generators

Bought/levelled with Biomass; cost scales by `costScale`. `osmotic_pump` (+1 Water/s),
`enzymatic_exudates` (+1 Nutrients/s). `baseCost 5`, `costScale 1.7`, `maxLevel 10`
→ Lv0 = 5, Lv1 = 8, Lv2 = 14, Lv3 = 24, Lv4 = 41, Lv5 = 70, Lv6 = 120… The first six
purchase steps stay under the base `100` Biomass cap; the seventh (120) deliberately asks
for a Biomass cap expansion first.

**Metabolic upkeep** adds a gentle drain to both pools that grows with complexity
(`UPKEEP_PER_LEVEL × level` + `UPKEEP_PER_ECHO × echoes` + `UPKEEP_PER_EXPANSION × expansions`),
charged only while `gamePhase === 'active'`. It trims a maxed network from `+9.2/s` to a
~25% smaller net surplus. `getNetResourceRate` / `getUpkeepRate` in `math.ts`; shown in the
Gather panel.

### Field actions (manual)

- **Absorb** — `+2 Water, +2 Nutrients`, 5s cooldown, clamped to caps.
- **Synthesize Biomass** — `10 Water + 10 Nutrients → 1 Biomass` at healthy reserves, `0.5`
  when strained (<40% either), `0` near starvation (<5%). Resources are consumed either way.

### Starvation

Either reserve **< 5%** → passive Biomass halts + warning. Generators and Absorb still work,
so it recovers. Combat yield is already 0 well before this.

### Combat yield thresholds

Water ≥35% **and** Nutrients ≥40% → 100% · one below → 50% · both below → 15% · either <15% → 0%.

### Lysate & cap expansion

Combat drops **Raw Lysate**; each tick raw → banked by spending Water + Nutrients, else it
decays. Banked Lysate buys `+10` to any cap at `10 × 1.5^count` Lysate.

### Combat

Pixi.js arena (500×500 logical). Spores auto-fire; you dodge (WASD/arrows or drag). 12 attack
patterns. Victory → Biomass + Raw Lysate + assimilation; defeat → trauma (recovery lock).
Reward = `(25 + 15×difficulty) × yieldMult × strain.rewardMult` Biomass, and
`5 × difficulty × strain.lysateMult` Lysate.

### Radar (sonar)

Blips drift in ~every 20s while idle, up to 2 slots (3 with **Extended Range**). Spend 5 Water
to **scan** (reveal) or **ping** (force a blip). Revealed contacts show level, strain, reward,
assimilation %. Contacts drift away after 120s.

### Strains

Normal 72% · Swift 10% (+30% speed, +25% reward) · Armored 10% (+50% HP, +30% reward) ·
Bloated 8% (−15% speed, +60% reward, +50% Lysate).

### Assimilation & echoes

Each win assimilates that host by `10 + difficulty×5`; at 100 the host is grown over → its
**echo** joins your network and the next host tier unlocks. Separately, each win adds a small
fixed `GLOBAL_STRAIN_PER_WIN` (2) to the global `assimilationPercent`, which — with the alert
level — slowly reduces passive Biomass. The two drags are **added, then capped** by
`ECOLOGICAL_DRAG_CAP` (0.5), so repeated wins never compound into a deep income cliff, and the
win screen shows the current strain/alert and the resulting income drag. Echoes grant **real
effects** through `packages/game-engine/src/echoes.ts` — passive Biomass, fire rate/damage,
poison, HP regen, movement speed, dodge window, evasion, and mutation-cost reduction.

### Offline progression

The save carries `lastSavedAt`; on load the elapsed gap (capped at 8h) is simulated at a base
50% rate, `+25%` per **Dormant Spores** level (max 100%). Expeditions and trauma run in real
time, stale contacts expire, and a dismissible **Welcome back dialog**
(`WelcomeBackDialog.svelte`) greets the player with the Biomass / Water / Nutrients / Lysate
change, any expeditions that returned, and the offline rate. See
`packages/game-engine/src/offline.ts`.

### Hosts & tiers

11 hosts + tutorial `soil_nematode`. Tiers gate by echoes collected: T1 (0), T2 (2), T3 (4),
T4 (6), Boss T5 (9). See `GAME-DESIGN.md` for the full table.

### Mutations & echoes

The **Evolution** overlay (opened from the wheel's **Evolve** stage) has two sections:
**Mutations** (three tree groups: Aggression, Resilience, Proliferation) and **Evolutionary
echoes**. Mutations are bought with **genome points**; echoes are earned by assimilating hosts. The
full breakdown — every node, prerequisite, cost and effect — is in **§12**. Expeditions are
separate (send a host to forage; 1 slot, 2 with the **Overmind** mutation).

---

## 6. UI structure

- **Shell** (`+layout.svelte`): top bar (brand, Online; the **Reset** button is dev-only,
  behind `mycosurge_dev`). Single view + scrollable center; mobile = stacked content + bottom
  `ActivityLog`. Breakpoint 768px.
- **Navigation**: only `/` (Core) is a route. **Evolution / Expeditions open as overlays**
  (right drawer ≥768px, full-screen sheet <768px), driven by `stores/ui.svelte.ts` (an overlay
  stack). There are **no top-bar launchers**: Evolution opens from the Evolve phase panel
  (gated on `unlockedSystems.evolution`); Expeditions currently has no in-game entry point.
  Browser Back closes the top overlay; when nothing is open it confirms before leaving.
- **Core** (`+page.svelte`): three panels — **left `ResourcePanel`** (Water / Nutrients /
  Biomass / Lysate readouts + colony vitals), **center `GrowthCycleWheel`** (nucleus slot is
  `CycleCore`, showing the active stage + objective), **right `PhaseDetailPanel`** (stage-specific
  actions only — resources are gone from here; capacity upgrades live in the **Gather** tab).
  Activity sits under the stage options in the right column on wide screens; at 768–1079px the
  resources collapse to a top strip and activity tucks under the stage column below; <768px uses
  the stepper and the layout's bottom log.
- **Hunt**: there is no separate Radar UI. The Hunt phase in `PhaseDetailPanel` renders
  `HuntSection` (`mode="full"`), the single home for sonar contacts / combat entry. The
  tutorial handoff renders the same component (`mode="tutorial"`) inline with its scan flow.
- **Overlays**: `Overlay.svelte` is the shared drawer/sheet (Back button, scrim, focus not
  stolen — `autofocus` off); panels live in `components/panels/`. **Combat**
  (`CombatModal.svelte`) layers on top of the single Core view via `uiStore.openCombat(hostId)`;
  tutorial completion (`onReturn` → `closeAll`) closes the stack. Any close path disengages
  the host.

---

## 7. The Growth Cycle (most recent feature)

A 4-stage loop — **Gather → Grow → Hunt → Evolve → (Gather)** — shown as a circular wheel
with a contextual detail panel. It is **navigation/teaching only**; it never acts on its own.
(The Evolve stage's internal id is `expand`; only its label changed.)

### Phases & panel contents

| Phase      | Panel shows                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| **Gather** | **Absorb** + the three `+10 cap` capacity upgrades (spend Lysate)                         |
| **Grow**   | **Synthesize Biomass** + generator purchase cards                                         |
| **Hunt**   | Sonar contacts (badge/level/strain/Echo, Scan/Ping/Engage/Dismiss) + locked-signal teaser |
| **Evolve** | Acquired echoes list + the **Evolution** button (opens the overlay)                       |

### How the suggestion works

`getRecommendedPhase(state)` (`packages/game-engine/src/phase.ts`) is a **priority ladder**
evaluated top-to-bottom every tick; first match wins:

1. Not in full game / in trauma → **Gather**
2. Starving (either reserve <5%) → **Gather**
3. Mid-fight (`currentHostId`) → **Hunt**
4. A reserve <40% → **Gather** (a low-yield fight isn't worth it)
5. A revealed contact → **Hunt**
6. A pool ≥90% full **and** you can afford _that_ pool's expansion → **Evolve** (`expand`)
7. Biomass < next generator cost → **Grow**
8. All generators maxed + Lysate ≥ cheapest expansion → **Evolve** (`expand`)
9. Lysate (banked+raw) < cheapest expansion → **Hunt**
10. Otherwise → **Grow**

Constants: `LOW_RESERVE_RATIO 0.4`, `FULL_RESERVE_RATIO 0.9`. The result marks the suggested
arc (dashed) and, when it differs from the active stage, blinks that label's dot and shows the
"Wants to <stage>" chip in the centre. **Known mismatch:** steps 6/8 still return `expand`, but
the cap-expansion controls were later moved to the **Gather** panel — so when the engine suggests
Evolve for a capacity upgrade, the buttons now live one stage earlier. Tracked in §9.

### Current interaction model

**The engine suggests; the player chooses — and it never auto-switches.** The active stage is
seeded from the recommendation on load and only changes when the player clicks a wheel label /
mobile step. While the active stage differs from the recommendation, the suggested arc is dashed
with a **blinking dot** on its label and the centre nucleus shows a **"Wants to <stage>"** chip
tinted to the suggested tone; when the player is already on it, no suggestion shows. The selected
arc stays lit.

### Files

- `packages/game-engine/src/phase.ts` (+ `phase.test.ts`) — heuristic + cost helpers.
- `apps/web/src/routes/+page.svelte` — active-stage `$state` (seeded once, never auto-switches),
  the three-panel composition, and the mobile stepper.
- `apps/web/src/lib/content/phases.ts` — `PHASES` metadata, `phaseMeta()`.
- `apps/web/src/lib/components/GrowthCycleWheel.svelte` — SVG arcs + labels + nucleus slot.
- `apps/web/src/lib/components/CycleCore.svelte` — centre nucleus (stage icon + objective +
  "Wants to <stage>" chip).
- `apps/web/src/lib/components/ResourcePanel.svelte` — left resources list + colony vitals.
- `apps/web/src/lib/components/PhaseDetailPanel.svelte` — per-stage options (right column).

---

## 8. Recent changes (this session)

- **Three-panel Core**: resources moved out of the stage panels into a single left
  `ResourcePanel` (all four pools + colony vitals; capacity upgrades live in the Gather stage),
  the wheel's nucleus became `CycleCore` (stage + objective), and `PhaseDetailPanel` now holds
  only stage options. `ColonyNucleus` was retired; `HuntSection` lost its duplicate Lysate
  strip; `ActivityLog` gained an `embedded` variant. See §6.
- **Top-bar launchers removed**: the Evolution / Expeditions buttons are gone from
  `+layout.svelte`. Evolution stays reachable from the Evolve phase panel; **Expeditions has no
  entry point** at present (its panel/overlay code is still there). Reset and the tutorial
  Skip-intro button are now dev-only (see `DEV-NOTES.md` → Developer flag).
- **Result clarity + offline dialog**: combat now opens with an unmistakable **Victory** /
  **Defeat** headline (mark + word + one-line outcome) and a tinted frame, so the result is
  never ambiguous; the offline "Welcome back" banner became a centered
  `WelcomeBackDialog.svelte` listing the Biomass / Water / Nutrients / Lysate change and any
  expeditions that returned.
- **Navigation → overlays → Hunt**: removed the desktop `Sidebar`, mobile `Nav`, the
  `/radar`/`/evolution`/`/expeditions` routes, **and the `RadarPanel` drawer**. The Hunt phase
  now owns all sonar/contact/combat UI via the shared `components/hunt/HuntSection.svelte`
  (`mode="full"` in the phase panel, `mode="tutorial"` inline in the tutorial handoff);
  `Overlay.svelte` drawers remain for Evolution/Expeditions. `+layout.svelte` shows top-bar
  launcher buttons (unlock-gated, "New" badges). Browser Back closes the top overlay
  (confirm-on-exit when none is open); `autofocus` is off. The Growth Cycle wheel was enlarged
  (`min(700px, 74vh)`). Copy: user-facing "Radar" → "Hunt"; `SYSTEM_META.route` dropped.
- **Icon assets (Tier 0 + Tier 1)**: 13 Gemini-generated icons (Water, Nutrients, Biomass,
  Lysate, Echo, Core + Radar, Evolution, Expeditions, Gather, Grow, Hunt, Evolve) live as 256px
  PNGs in `apps/web/static/assets/icons/`. A registry (`content/icons.ts` → `ICON_META`) and
  `<ResourceIcon>` render the PNG when present and fall back to the original Unicode glyph when
  missing (`round` clips badge icons). Wired into `PhaseDetailPanel` (phase header, resource
  labels, net-income strip, generators), `SystemsUnlocked` (Core/Radar cards) and
  `TutorialIntro` (generator rows). See `ASSET-PLAN.md` (workflow + tiers) and `PROMPTS.md`
  (per-icon prompts). No free Gemini image API tier, so generation is manual via Google AI
  Studio. Next: Tier 2 host portraits. Interim note: the Gemini badges were cropped to fill
  their tiles (uniform 192px) until hand-drawn, free-floating icons replace them.
- **Phase 2 progressive disclosure**: after the tutorial only the core chain (Core, Hunt)
  shows. **Evolution and Expeditions** both reveal at the **first echo**
  (`packages/game-engine/src/systems.ts` → `getSystemUnlocks`). Evolution is opened from the
  Evolve phase panel once unlocked; each reveal logs a one-time toast (`mycosurge_reveals` in
  localStorage).
  The post-tutorial overlay is now reactive (also fires for `?skipintro`, which reveals all for
  QA).
- **Phase 1 economy + assimilation**: gentle **metabolic upkeep** (`UPKEEP_PER_LEVEL/ECHO/
EXPANSION`) that keeps a maxed network honest without starving it; a deterministic
  **30-minute balance sim** (`economy.balance.test.ts`); the Core Gather panel now shows
  `produced · upkeep · net`; global **ecological strain** is decoupled from per-host echo
  progress (`GLOBAL_STRAIN_PER_WIN 2`) and surfaced with its drag, and the Evolution page
  summarises active echo bonuses. See `FEEDBACK-PLAN.md` → Phase 1.
- **P0 feedback follow-ups**: manual Growth Cycle phase selection (recommendation as advice,
  sticky after first pick); **echoes wired as real effects** (`echoes.ts`, arena poison/move/
  dodge/evade, Evolution list shows names + descriptions); **offline progression** with a
  capped catch-up and "Welcome back" summary. See `FEEDBACK-PLAN.md`.
- **Theme swap** to the Stitch "Bio-Luminal" palette (mint `#70fdc3`, cyan `#68d6e3`, amber
  `#f5c055`, coral `#ffb4ab`). Token-driven; see `UI-REVAMP-PLAN.md` → Phase 6.
- **Growth Cycle** Core layout implemented (§7).
- **Review pass fixes**: correct combat-reward preview (`previewCombatReward`), per-pool
  expand affordability, Engage disabled during trauma, combat HP persisted across re-entry,
  40px touch targets, extra heuristic tests.
- **QOL**: `?skipintro` / Skip intro now **fills Water + Nutrients to cap** on skip.
- **Bug fix**: renamed the wheel's `.ring` class — it collided with Tailwind v4's generated
  `.ring` utility (drew a stray box around the wheel).

---

## 9. Known debt / open questions

See `DEV-NOTES.md` for the full list. Highlights:

- **Combat wiring ownership**: `CombatModal` imports `completeTutorial`/`applyTutorialDefeat`
  directly from the engine instead of via `gameStore`.
- **`upgradeLevels` is legacy**: the growth-upgrades system was removed and folded into
  Proliferation (see §12); `GameState.upgradeLevels` is kept only so old saves still load and is
  no longer read by any system.
- **Evolve vs Gather mismatch**: `getRecommendedPhase` still suggests **Evolve** for capacity
  upgrades (ladder steps 6/8), but the `+10 cap` controls were moved to the **Gather** panel. The
  suggestion should probably point at Gather (or the controls returned to Evolve). See §7.
- **Tutorial-only state fields** persist in `GameState` but are unused once `gamePhase==='active'`.
- **`soil_nematode`** is the tutorial host; decide whether it should ever appear in the pool (its
  echo is otherwise unobtainable in the full game — see §12.3).
- **Reward preview** now uses the real formula; expedition rewards still use `host.biomassReward`.

---

## 10. Verification checklist

```sh
pnpm check
pnpm lint
pnpm --filter @mycosurge/game-engine test   # currently 172 tests
pnpm --filter web test                      # currently 14 tests
pnpm build
```

QA: `?skipintro` jumps straight to the full game (and now fills storages). The top-bar
**Reset** button (dev-only, behind `mycosurge_dev`) clears progress. Manual reset: clear
`localStorage` keys `mycosurge_save` + `mycosurge_unlock_seen` + `mycosurge_reveals` (the
app's Reset button clears all three).

---

## 11. Key tuning constants (`packages/config/src/constants.ts`)

`BASE_BIOMASS_PER_SEC 0.5` · `MAX_BIOMASS_BASE 100` · `MAX_WATER_BASE 100` ·
`MAX_NUTRIENT_BASE 100` · `WATER_DEPLETION_RATE 0.8` · `NUTRIENT_DEPLETION_RATE 0.8` ·
`WATER_YIELD_THRESHOLD 0.35` · `NUTRIENT_YIELD_THRESHOLD 0.4` · `STARVATION_THRESHOLD 0.15` ·
`STARVATION_STATE_THRESHOLD 0.05` · `LYSATE_BASE_REWARD 5` · `LYSATE_RAW_DECAY_RATE 1` ·
`LYSATE_MAX_STABILIZE_RATE 1` · `LYSATE_STABILIZE_WATER_COST 2` ·
`LYSATE_STABILIZE_NUTRIENT_COST 2` · `SONAR_INTERVAL 20` · `SONAR_JITTER 0.3` ·
`SONAR_INITIAL_DELAY 5` · `CONTACT_LINGER 120` · `SCAN_WATER_COST 5` ·
`BASE_CONTACT_SLOTS 2` · `MAX_CONTACT_SLOTS 3` · `HOST_ASSIMILATION_TARGET 100` ·
`MANUAL_ABSORB_AMOUNT 2` · `MANUAL_ABSORB_COOLDOWN 5` · `MANUAL_SYNTH_WATER_COST 10` ·
`MANUAL_SYNTH_NUTRIENT_COST 10` · `LYSATE_CAP_EXPAND_COST_BASE 10` ·
`LYSATE_CAP_EXPAND_AMOUNT 10` · `LYSATE_CAP_COST_SCALE 1.5` · `COMBAT_BIOMASS_BASE 25` ·
`COMBAT_BIOMASS_PER_DIFFICULTY 15` · `TRAUM_BASE_DURATION 30` · `EXPEDITION_BASE_TIME 300` ·
`GENOME_BASE_POINTS 6` · `GENOME_POINTS_PER_ECHO 2` · `RESPEC_BIOMASS_COST 40` ·
`UPKEEP_PER_LEVEL 0.1` · `UPKEEP_PER_ECHO 0.1` ·
`UPKEEP_PER_EXPANSION 0.05` · `GLOBAL_STRAIN_PER_WIN 2` · `ECOLOGICAL_DRAG_CAP 0.5` ·
`OFFLINE_MAX_SECONDS 28800` · `OFFLINE_BASE_RATE 0.5` ·
`OFFLINE_DORMANT_BONUS_PER_LEVEL 0.25`. Generator `costScale 1.7` lives in
`packages/config/src/generators.ts`.

---

## 12. Evolution — mutations & echoes

The **Evolution** overlay (`apps/web/src/lib/components/panels/EvolutionPanel.svelte`, an
`Overlay` drawer) is the game's permanent-progression surface. It opens from the wheel's
**Evolve** stage via that stage's **Evolution** button (shown once `unlockedSystems.evolution`,
which reveals at the **first echo**). It has two sections, in order:

1. **Mutations** — repeatable combat/economy passives (the "skill tree"), grouped under the
   three tree headings.
2. **Evolutionary echoes** — one-shot traits inherited from each assimilated host, plus an
   aggregated "Active bonuses" summary.

Mutations are paid with a limited budget of **genome points** (not Biomass); echoes are earned.
Capacity (`+10` to a Water / Nutrients / Biomass cap) is **not** in this overlay — it lives in the
Core's **Gather** stage and costs **Lysate** (see §5 "Lysate & cap expansion" and §12.3).

### 12.1 Mutations (skills)

- **Budget:** `GENOME_BASE_POINTS (6) + GENOME_POINTS_PER_ECHO (2) × acquiredEchoes`, plus `+3`
  for the **Experimental DNA** echo. `spent` is the sum of each node's `pointCost` over allocated
  levels, so a player **cannot own every node** and builds diverge. The full tree costs
  **49 points**; the budget tops out around **31**.
- **Point cost:** every node costs **1** per level except the capstones **Chain Reaction**,
  **Emergency Evac** and **Overmind**, which cost **3** (`pointCost` on `SkillNodeDef`,
  defaulting to 1 when omitted).
- **Prerequisites:** a mutation unlocks once **every prerequisite has at least level 1**
  (`level >= 1`), not when it is fully maxed (`arePrerequisitesMet`,
  `packages/game-engine/src/skills.ts`).
- **Respec:** clears every allocation and refunds the points. The first respec is **free**; later
  ones cost **`RESPEC_BIOMASS_COST (40)` Biomass**. Unavailable during combat or trauma. Derived
  combat stats are fully recomputed from the (now empty) allocations, and Biomass is clamped to
  the new cap (losing Mycelial Expansion can lower it).
- **UI/currency:** the panel lists all 20 mutations grouped under **Aggression**, **Resilience**
  and **Proliferation**, with a `Genome: spent / total` bar and a **Respec** button at the top of
  the section, and `n pt` + an **Upgrade** button (disabled with a reason when locked or
  unaffordable) on each row.
- Effects are applied incrementally in `applySkillEffects`; a few (trauma, expeditions, offline,
  cap, radar slots, the Nitrogen Fixation trickle) are read lazily by `math.ts` / `offline.ts` /
  `radar.ts` instead.

**Aggression** — arena offense

| Mutation       | Pts | Max | Prerequisite (≥1)          | Effect                         |
| -------------- | --- | --- | -------------------------- | ------------------------------ |
| Spore Speed    | 1   | 3   | —                          | projectile speed +10%/lvl      |
| Fire Rate      | 1   | 3   | Spore Speed                | fire rate +15%/lvl             |
| Multi-Shot     | 1   | 2   | Fire Rate                  | +1 projectile per volley/lvl   |
| Piercing Shot  | 1   | 1   | Multi-Shot                 | spores pierce one enemy        |
| Overcharge     | 1   | 3   | Spore Speed                | damage +20%/lvl                |
| Chain Reaction | 3   | 1   | Piercing Shot + Overcharge | kills explode, damaging nearby |

**Resilience** — survivability

| Mutation            | Pts | Max | Prerequisite                          | Effect                   |
| ------------------- | --- | --- | ------------------------------------- | ------------------------ |
| Compact Core        | 1   | 3   | —                                     | hitbox −10%/lvl          |
| Spore Shield        | 1   | 3   | Compact Core                          | +1 absorb hit/lvl        |
| Trauma Recovery     | 1   | 3   | Spore Shield                          | trauma duration −15%/lvl |
| Regenerative Spores | 1   | 2   | Compact Core                          | HP regen +0.5/s per lvl  |
| Adaptive Membrane   | 1   | 2   | Trauma Recovery + Regenerative Spores | damage taken −15%/lvl    |
| Emergency Evac      | 3   | 1   | Adaptive Membrane                     | auto-retreat at 1 HP     |

**Proliferation** — economy

| Mutation             | Pts | Max | Prerequisite                    | Effect                           |
| -------------------- | --- | --- | ------------------------------- | -------------------------------- |
| Mycelial Expansion   | 1   | 3   | —                               | max Biomass +75%/lvl             |
| Metabolic Efficiency | 1   | 3   | Mycelial Expansion              | passive Biomass +25%/lvl         |
| Rapid Scouts         | 1   | 3   | Metabolic Efficiency            | expedition time −20%/lvl         |
| Resource Routing     | 1   | 2   | Mycelial Expansion              | expedition reward +30%/lvl       |
| Nitrogen Fixation    | 1   | 1   | Mycelial Expansion              | +0.5 Nutrients/s passive         |
| Dormant Spores       | 1   | 2   | Rapid Scouts + Resource Routing | offline rate +25%/lvl (base 50%) |
| Overmind             | 3   | 1   | Dormant Spores                  | run 2 expeditions at once        |
| Extended Range       | 1   | 1   | —                               | +1 radar contact slot            |

The budget constants live in `packages/config/src/constants.ts`.

### 12.2 Evolutionary echoes

- **Acquisition:** every combat victory adds `10 + difficulty×5` to that host's
  `hostAssimilation` (target 100). At 100 — once per host — its **echo** is pushed to
  `acquiredEchoes` and `hostsDefeated` ticks up (`applyVictory`,
  `packages/game-engine/src/combat.ts`). The echo count also drives radar **tier unlocks**
  (T2 at 2, T3 at 4, T4 at 6, Boss at 9 — `HOST_TIER_UNLOCK`).
- **Effects** are aggregated additively by `getEchoEffects(acquiredEchoes)`
  (`packages/game-engine/src/echoes.ts`). Combat reads them through `getEffectiveCombatStats`,
  passive income through `getEffectiveBiomassPerSec`, and the mutation budget through
  `genomePoints`.
- **Upkeep tax:** each acquired echo adds `UPKEEP_PER_ECHO 0.1` to **both** the Water and
  Nutrients drain (`getUpkeepRate`) — the "complexity tax" the panel's summary note describes.

| Host (tier)              | Echo name            | Effect              |
| ------------------------ | -------------------- | ------------------- |
| Soil Nematode\*          | Nematode Resilience  | passive Biomass +3% |
| Fallen Leaf (T1)         | Photosynthetic Trace | passive Biomass +5% |
| Compost Worm (T1)        | Regenerative Matrix  | HP regen +1/s       |
| Garden Beetle (T2)       | Chitinous Remnant    | spores +2 poison/s  |
| Field Mouse (T2)         | Mammalian Metabolism | move speed +10%     |
| Pond Frog (T2)           | Amphibious Membrane  | evasion +12%        |
| Urban Pigeon (T3)        | Avian Adaptability   | fire rate +8%       |
| Backyard Squirrel (T3)   | Neural Agility       | fire rate +10%      |
| Stray Cat (T4)           | Reflex Override      | dodge window +15%   |
| Feral Raccoon (T4)       | Adaptive Cortex      | spore damage +15%   |
| Laboratory Rat (Boss T5) | Experimental DNA     | +3 genome points    |

\* `soil_nematode` is tutorial-only and never enters the sonar pool, so its echo is normally
unobtainable in the full game (see §9).

The panel's **Active bonuses** chips summarise whichever effects are non-zero: passive Biomass,
spore damage, fire rate, poison, HP regen, move speed, dodge window, evasion, and bonus genome
points.

### 12.3 Cost quick reference

| Purchase             | Currency      | Formula                                     |
| -------------------- | ------------- | ------------------------------------------- |
| Capacity (`+10` cap) | Lysate        | `floor(10 × 1.5^expansions)` — Gather stage |
| Generators           | Biomass       | `floor(5 × 1.7^level)`                      |
| Mutations            | Genome points | budget `6 + 2×echoes (+3 Experimental DNA)` |
| Respec               | Biomass       | free first time, then `40` Biomass          |

### 12.4 Files

- `packages/config/src/skill-trees.ts` — `SKILL_NODES` (20), `pointCost`, `SKILL_TREES`,
  `SkillNodeDef`.
- `packages/config/src/constants.ts` — `GENOME_BASE_POINTS`, `GENOME_POINTS_PER_ECHO`,
  `RESPEC_BIOMASS_COST`.
- `packages/config/src/hosts.ts` — each host's `echoes {id,name,description}` + tier gates.
- `packages/game-engine/src/skills.ts` — point budget, prereq/purchase, `respecSkills`,
  `migrateSkillAllocations`, `applySkillEffects` / effect recompute.
- `packages/game-engine/src/radar.ts` — `getRadarSlots` reads the `extended_range` allocation.
- `packages/game-engine/src/echoes.ts` — `getEchoEffects` (incl. `genomePoints`),
  `getEffectiveCombatStats`, `getEchoName` / `getEchoDescription`.
- `packages/game-engine/src/math.ts` — resource math and `getNutrientFixationBonus`.
- `apps/web/src/lib/components/panels/EvolutionPanel.svelte` — the overlay UI (genome bar, respec).
