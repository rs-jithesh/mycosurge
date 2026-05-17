# MycoSurge Implementation Plan

## Overview

Browser-based incremental/idle game with bullet hell combat. A fungal network simulation with resource management, combat, and cap expansion. Built in Svelte 5 + TypeScript + Pixi.js v8.

### Core Loop

Resource management → Combat → Cap expansion → (loop)

### Aesthetic

Terminal UI, ecological horror, biological theming. Brutalist: 0 border-radius, no shadows/gradients, JetBrains Mono, ASCII progress bars.

---

## Phase A — Foundation: Seamless Tutorial + Permanent Resources

Make Water/Nutrients real resources in the `active` game phase. Remove the hard tutorial reset. Implement combat yield processing thresholds.

- A1. Streamline tutorial phases (merge awakening→manager into one, preserve resources across phase transitions)
- A2. Permanent resource depletion tick for Water/Nutrients
- A3. Combat yield processing thresholds (35% Water / 40% Nutrients / 15% starvation)
- A4. Dynamic Core page UI (AsciiBar component, dynamic status text, dynamic critical state)

**Unlocks**: The management layer is real. Players see Water/Nutrients tick down and feel pressure to keep thresholds.

---

## Phase B — Generators

Passive Water/Nutrient production system. The tutorial generators (Osmotic Pump, Enzymatic Exudates) become permanent. Additional generator upgrades available.

- B1. Generator config and state types
- B2. Generator tick in idle loop
- B3. Generator UI panel on Core page

**Unlocks**: Replenishment side of the flywheel.

---

## Phase C — Lysate & Combat Yield

Lysate as a combat-exclusive perishable resource. Auto-stabilization via Water/Nutrients. Cap expansion spending.

- C1. Lysate state (raw + banked), production on combat victory
- C2. Auto-stabilization and decay per tick
- C3. Cap expansion functions (spend banked Lysate)
- C4. Lysate display on Core page

**Unlocks**: The flywheel closes — combat → Lysate → cap expansion → more resources.

---

## Phase D — Upgrades on /evolution

The 12 economy upgrades from the plan (Section 5.2–5.4) merged onto the /evolution page alongside the existing combat skill tree.

- D1. Upgrade config (costs, prereqs, effects)
- D2. Upgrade purchase engine logic
- D3. Evolution page rebuild: NEURAL MUTATIONS (skills) + ECONOMY UPGRADES (3 categories)

**Unlocks**: Deepens the management layer.

---

## Phase E — Remaining UI Polish

- E1. Skill tree purchase UI on /evolution
- E2. Expedition launch/collect UI
- E3. Wire action buttons (SCAN → /radar, GENERATORS → Core panel, UPGRADES → /evolution)
- E4. Clean up dead tutorial code

---

## Key Design Decisions

| Question                   | Decision                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| Tutorial vs seamless flow  | **Seamless** — tutorial transitions into full game without resource reset |
| Tutorial phases            | **Streamlined** — fewer phases, no hard transition point                  |
| Lysate stabilization       | **Automatic** — passive drain per tick                                    |
| Upgrade page vs /evolution | **Merge onto /evolution** — one page for all upgrades                     |
| Desktop radar on Core page | **No** — not needed; radar has its own route                              |

## Dependency Graph

```
A (Foundation)
└── B (Generators)
    └── C (Lysate & Combat Yield)
        └── D (Upgrades on /evolution)
            └── E (UI Polish)
```
