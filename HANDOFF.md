# Mycosurge — Handoff

Status: **in active development.** Everything below reflects the current working tree.
Note: the repo has a single commit (`init repo`); **all changes are uncommitted.**

Purpose: a self-contained brief so a reviewer/agent can understand the game, its current
state, and where everything lives without reading the whole codebase.

---

## 1. TL;DR

Mycosurge is a browser **idle / bullet-hell / RPG hybrid**. You grow a sentient fungal
network: harvest Water + Nutrients, synthesise Biomass, automate with generators, fight
hosts in a Pixi.js arena for Lysate, and spend Lysate to raise caps. The UI is a
"Bio-Luminal Lab" instrument panel.

**Most recent work:** a **Growth Cycle** Core layout (a 4-stage wheel + contextual panel
with an automatic "what to do next" suggestion), a Stitch palette/theme swap, and a review
pass that fixed several flow bugs. See §7.

---

## 2. Repo layout

```
mycosurge/
├── apps/web/                 # SvelteKit 5 SPA (ssr=false, prerender=true)
│   └── src/
│       ├── app.css           # font import + @import '@mycosurge/design-system'
│       ├── lib/
│       │   ├── components/   # Sidebar, Nav, CombatModal, TutorialIntro, ActivityLog,
│       │   │                 #   GrowthCycleWheel, ColonyNucleus, PhaseDetailPanel, …
│       │   ├── content/      # onboarding.ts (tutorial steps), phases.ts (growth-cycle meta)
│       │   ├── pixi/         # Pixi.js v8 arena engine (radar.ts, constants.ts)
│       │   └── stores/       # game.svelte.ts (game store), log.svelte.ts (activity log)
│       └── routes/           # / (Core), /radar, /evolution, /expeditions
├── packages/
│   ├── config/               # pure TS: constants, hosts, generators, upgrades, strains, skills
│   ├── game-engine/          # pure TS: combat, expeditions, math, radar, manual, phase, skills
│   └── design-system/        # CSS tokens + @theme block (no build step)
└── docs: AGENTS.md, DESIGN.md, GAME-DESIGN.md, COMBAT.md, DEV-NOTES.md,
         UI-REVAMP-PLAN.md, RADAR-ECONOMY-PLAN.md, GROWTH-CYCLE-LAYOUT-PLAN.md
```

Build order (Turbo): `config → game-engine → design-system → web`. All packages are ESM.

---

## 3. Tech stack & commands

- **SvelteKit 5** + **Svelte 5 runes** (`$state`, `$derived`, `$props`, `$effect`) — *not* Svelte 4.
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
`baseBiomassPerSec`, `lysateRaw`/`lysateBanked`, `generators{}`, `upgradeLevels{}`,
`skillAllocations{}`, `hostAssimilation{}`, `assimilationPercent`, `alertLevel`, `isInTrauma`,
`traumaTimer`, `combatStats{}`, `contacts[]`, `expeditions[]`, `acquiredEchoes[]`,
`hostsDefeated`, `totalBiomassEarned`, `manualCooldown`, `tutorialUpgrades{}`.

`gamePhase`: `awakening → manager → explorer → tactician → active`. The full game (sidebar,
Evolution, Expeditions, the Growth Cycle) is gated on `gamePhase === 'active'`.

---

## 5. Core systems

### Resources
| Resource | Behaviour | Role |
| --- | --- | --- |
| **Water** | passive drain; made by generators | gating resource |
| **Nutrients** | passive drain; made by generators | digestion gate |
| **Biomass** | accumulates + combat rewards | currency (generators, mutations, upgrades) |
| **Lysate** | combat only; perishable | spent to expand caps |

Each pool has a cap. Rewards arriving above a cap are **kept** (never silently deleted).

### Generators
Bought/levelled with Biomass; cost scales by `costScale`. `osmotic_pump` (+1 Water/s),
`enzymatic_exudates` (+1 Nutrients/s). `baseCost 5`, `costScale 2`, `maxLevel 10`
→ Lv0 = 5, Lv1 = 10, Lv2 = 20…

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
**echo** joins your network and the next host tier unlocks. Global `assimilationPercent`
slowly reduces passive Biomass.

### Hosts & tiers
11 hosts + tutorial `soil_nematode`. Tiers gate by echoes collected: T1 (0), T2 (2), T3 (4),
T4 (6), Boss T5 (9). See `GAME-DESIGN.md` for the full table.

### Mutations & upgrades
- **Mutations** (Biomass, Evolution page): 3 trees — Aggression, Resilience, Proliferation.
  Prerequisites must be fully levelled.
- **Growth upgrades** (Biomass): Network / Combat / Structure lines.
- **Expeditions**: send a host to forage; returns after real time for bonus Biomass. 1 slot
  (2 with **Overmind**).

---

## 6. UI structure

- **Shell** (`+layout.svelte`): top bar (brand, Online, Reset). Desktop = left `Sidebar` +
  scrollable center. Mobile = stacked content + bottom `ActivityLog` + `Nav`. Breakpoint 768px.
- **Routes**: `/` (Core), `/radar`, `/evolution`, `/expeditions`. Evolution/Expeditions
  redirect home until `gamePhase === 'active'`.
- **Core** (`+page.svelte`): Growth Cycle wheel + detail panel + desktop Activity panel.
- **Combat**: `CombatModal.svelte` is owned by the Radar route; a `$effect` auto-opens it
  whenever `gameStore.currentHost` is set (so engaging from Core works).

---

## 7. The Growth Cycle (most recent feature)

A 4-stage loop — **Gather → Grow → Hunt → Expand → (Gather)** — shown as a circular wheel
with a contextual detail panel. It is **navigation/teaching only**; it never acts on its own.

### Phases & panel contents
| Phase | Panel shows |
| --- | --- |
| **Gather** | Water/Nutrients meters, **Absorb**, passive-income summary |
| **Grow** | Biomass meter + rate, **Synthesize**, generator upgrade cards |
| **Hunt** | Banked/Raw Lysate, radar contacts (Scan/Ping/Engage/Dismiss), Open Radar |
| **Expand** | Lysate bank, three `+10 cap` rows, **Evolution** link |

### How the suggestion works
`getRecommendedPhase(state)` (`packages/game-engine/src/phase.ts`) is a **priority ladder**
evaluated top-to-bottom every tick; first match wins:

1. Not in full game / in trauma → **Gather**
2. Starving (either reserve <5%) → **Gather**
3. Mid-fight (`currentHostId`) → **Hunt**
4. A revealed contact → **Hunt**
5. A reserve <40% → **Gather**
6. A pool ≥90% full **and** you can afford *that* pool's expansion → **Expand**
7. Biomass < next generator cost → **Grow**
8. All generators maxed + Lysate ≥ cheapest expansion → **Expand**
9. Lysate (banked+raw) < cheapest expansion → **Hunt**
10. Otherwise → **Grow**

Constants: `LOW_RESERVE_RATIO 0.4`, `FULL_RESERVE_RATIO 0.9`. The result drives the wheel's
lit arc, the "Next step" text (`phaseMeta(phase).objective`), and which panel shows.

### Current interaction model
**No manual override.** The wheel and panel always follow the recommendation. Phase labels
and the mobile stepper are read-only indicators. (An earlier version had a click-to-inspect
override with a "Resume auto" link; it was removed because the wording read like autoplay.)

### Files
- `packages/game-engine/src/phase.ts` (+ `phase.test.ts`) — heuristic, cost helpers.
- `apps/web/src/lib/content/phases.ts` — `PHASES` metadata, `phaseMeta()`.
- `apps/web/src/lib/components/GrowthCycleWheel.svelte` — SVG arcs + labels + nucleus slot.
- `apps/web/src/lib/components/ColonyNucleus.svelte` — Biomass/rate/starving (full + compact).
- `apps/web/src/lib/components/PhaseDetailPanel.svelte` — per-phase controls.
- `apps/web/src/routes/+page.svelte` — composition, focus bar, mobile stepper.

---

## 8. Recent changes (this session)

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
- **Offline progression** is described by the Dormant Spores copy but not implemented (tick
  loop only runs while the tab is open).
- **Combat wiring ownership**: `CombatModal` imports `completeTutorial`/`applyTutorialDefeat`
  directly from the engine instead of via `gameStore`.
- **Tutorial-only state fields** persist in `GameState` but are unused once `gamePhase==='active'`.
- **`soil_nematode`** is the tutorial host; decide whether it should ever appear in the pool.
- **Growth Cycle**: no manual phase switching (by design — see §7); mobile still mounts a
  hidden non-compact `ColonyNucleus`; phase selection could use `role="tablist"` semantics.
- **Reward preview** now uses the real formula; expedition rewards still use `host.biomassReward`.

---

## 10. Verification checklist

```sh
pnpm check
pnpm lint
pnpm --filter @mycosurge/game-engine test   # currently 89 tests
pnpm --filter web test                      # currently 7 tests
pnpm build
```

QA: `?skipintro` jumps straight to the full game (and now fills storages). Top-bar **Reset**
clears progress. Manual reset: clear `localStorage` keys `mycosurge_save` +
`mycosurge_unlock_seen`.

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
`SKILL_COST_SCALE 1.5`.
