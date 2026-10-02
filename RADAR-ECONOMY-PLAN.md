# Radar & Economy Overhaul — Plan

Status: **shipped**. Approved direction: _hybrid sonar + tier unlocks_ for the Radar, and a
_full economy panel rework_.

## Problem

- The full-game Radar lists **all** hosts in a flat menu — no discovery, no randomness,
  and the boss is visible from the first second (`radar/+page.svelte`).
- The Core CTA "Scan for hosts · Costs 5 Water" navigates but never scans.
- `alertThreshold` is dead config; `difficulty` is cosmetic + reward-only.
- `assimilationPercent` is a single global bar, so an echo unlocks for whichever host
  happens to be engaged when it fills.
- Generator buttons show a bare number with no unit, no next-level delta.
- The engine charges `getSkillLevelCost` for economy upgrades while the UI shows
  `getGeneratorCost` — equal today only by coincidence.
- Biomass cap display uses the effective cap; expand cost uses the raw cap.
- Three near-identical "Expand …" buttons and an ambiguous Lysate "Unstabilized" header.

## Design

### Per-host assimilation (companion)

- Add `hostAssimilation: Record<string, number>`; each victory adds progress to **that**
  host. A host whose bar reaches 100 yields its echo and bumps `hostsDefeated` **once**.
- Keep `assimilationPercent` as the global ecological strain used by depletion/alert.

### Radar: sonar loop

`pool` (unlocked hosts) → `blips` (`[?]`, spawn passively) → `scan` (spend Water,
identify) → `contact` (engage / dismiss / expire).

| Piece             | Value                                                |
| ----------------- | ---------------------------------------------------- |
| Sonar interval    | 20s ±30%; only while no fight and not in trauma      |
| Contact slots     | 2 base, 3 with the **Extended Range** growth upgrade |
| Blip linger       | 120s, then drifts off                                |
| Scan cost         | 5 Water; always succeeds                             |
| Ping cost         | 5 Water; spawns a blip on demand                     |
| Repeat protection | last host excluded when the pool allows              |

Tier unlock counts use `acquiredEchoes.length`:

| Tier | Echoes required | Hosts                                 |
| ---- | --------------- | ------------------------------------- |
| 1    | 0               | Fallen Leaf, Compost Worm             |
| 2    | 2               | Garden Beetle, Pond Frog, Field Mouse |
| 3    | 4               | Urban Pigeon, Backyard Squirrel       |
| 4    | 6               | Stray Cat, Feral Raccoon              |
| Boss | 9               | Laboratory Rat                        |

`soil_nematode` is tutorial-only and never enters the pool.

**Strains** (per-contact modifiers):

| Strain  | Weight | Effect                               |
| ------- | ------ | ------------------------------------ |
| Normal  | 72%    | —                                    |
| Swift   | 10%    | +30% projectile speed, +25% reward   |
| Armored | 10%    | +50% HP, +30% reward                 |
| Bloated | 8%     | −15% speed, +60% reward, +50% Lysate |

### Economy

- One cost helper (`getGeneratorCost`) used by both engine and UI.
- Resource rows carry an inline `+10 cap · N Lysate` action.
- Generator cards show unit + next-level delta (`+2 → +3 Water/sec`) + time-to-afford.
- Lysate split into **Raw (decaying)** with a stabilization meter and **Banked**.

## Work breakdown

- [x] **R0** per-host assimilation + save migration
- [x] **R1** config tiers/strains + engine `radar.ts` + tests
- [x] **R2** Radar UI contact cards + Core CTA
- [x] **R3** unified cost helper + expand-by-resource API + tests
- [x] **R4** Core economy panel rework
- [x] **R5** design docs + `pnpm check / lint / test / build`
