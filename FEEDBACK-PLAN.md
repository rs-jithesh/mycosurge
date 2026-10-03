# Design Feedback — Response Plan

Status: **P0 shipped; Phase 1 (P1.1 + P1.2) shipped; Phase 2 (P1.3) shipped**. A prioritized
set of changes derived from an external design review of the current build. This doc records
what is real in the code today, what to change, and in what order.

Implemented so far: **P0.1** manual phase selection, **P0.2** echoes wired as real effects,
**P0.3** offline progression. See the per-item notes below.

Source: an independent agent's written feedback (agency, economy, echoes, offline, clarity).
Cross-checked against the working tree at the time of writing.

## Feedback → code mapping

| Feedback                                                       | Reality in the repo                                                                                                                                                                                                   | Verdict                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| #2 Growth Cycle forces the recommendation; no manual switching | `apps/web/src/routes/+page.svelte:35` derives `phase` directly from `gameStore.recommendedPhase`; wheel labels are read-only `div`s; "No manual override" is an explicit decision in `GROWTH-CYCLE-LAYOUT-PLAN.md:81` | **Real — top**          |
| #1 Core fantasy is strong                                      | Confirmed by `GAME-DESIGN.md` / `HANDOFF.md`                                                                                                                                                                          | Agree                   |
| #3 Heuristic is advice, not intent                             | `phase.ts` is a clean priority ladder; the problem is only that the UI treats it as control                                                                                                                           | Agree                   |
| #4 Economy snowballs into waiting                              | `packages/config/src/generators.ts`: each generator `+1/s`, `maxLevel 10`, both pools independent; depletion is only `0.8/s` each. Maxed = **+9.2/s net per pool** against `0.5/s` passive Biomass                    | **Real**                |
| #5 Cap expansion is a nice loop                                | Implemented (`math.ts` `expandCap`); reward is numeric only                                                                                                                                                           | Real, P2                |
| #6 Offline/idle mismatch                                       | `DEV-NOTES.md:63`: tick loop only runs in an open tab; skill `dormant_spores` promises "Offline progress +50%/level" but `applySkillEffects` does nothing (`skills.ts:109`)                                           | **Real broken promise** |
| #7 Combat should continue colony development                   | Mutation trees do feed `combatStats` (`skills.ts:61`), but echoes do not                                                                                                                                              | **Half-real**           |
| #8 Assimilation is the defining mechanic                       | Per-host assimilation exists (`combat.ts:44`) and gates tiers (`radar.ts:42`), but its only payoff is an echo id that is never applied                                                                                | **Real — high value**   |
| #9 Assimilation reduces passive Biomass                        | `assimilationPercent` multiplies income down to `0.7×` (`math.ts:31`) **and** raises `alertLevel`, which multiplies production down to `0.5×` (`math.ts:27`); never explained to the player                           | **Real**                |
| #10 Radar could feel like recon                                | `RadarContact.revealed` is a boolean only (2 states); no progressive intel                                                                                                                                            | Real, P2                |
| #11 Clarity over more systems                                  | Tutorial gates well; the post-tutorial `SystemsUnlocked` dump is the risk                                                                                                                                             | Agree                   |

**Most important finding:** all 11 host echoes in `packages/config/src/hosts.ts` promise real
effects (`+5%` biomass, `+2` poison, dodge `+15%`, skill costs `−10%`, …), but
`state.acquiredEchoes` is read _only_ by radar tier-gating. The progression reward the
feedback calls the game's defining mechanic is currently a placeholder string. Making echoes
real is both the cheapest bug fix and the strongest answer to #7/#8.

## Priorities

### P0 — do first, low risk, high impact

**P0.1 — Manual phase selection (agency)** — ✅ shipped

- Goal: separate _recommendation_ from _selection_. The heuristic stays, but the player can
  inspect and act on any phase.
- Change:
  - Add `selectedPhase` UI state in `apps/web/src/routes/+page.svelte`; default to the
    recommendation.
  - `GrowthCycleWheel.svelte`: phase labels become buttons, accept `selected` + `onselect`
    props; add `role="tablist"` / `radiogroup` semantics and keyboard support (also resolves
    the deferred a11y note in `GROWTH-CYCLE-LAYOUT-PLAN.md`).
  - Mobile stepper (`+page.svelte`): the 4 stops become selectable controls.
  - Focus bar: show **"Recommended: Hunt"** when selection ≠ recommendation, plus a
    "Follow suggestion" affordance. Objective copy reflects the _selected_ phase.
- Files: `apps/web/src/routes/+page.svelte`, `GrowthCycleWheel.svelte`,
  `apps/web/src/lib/content/phases.ts` (copy).
- Effort: ~1 day. No engine change. **Unblocks all remaining UI work.**
- Shipped as "auto-follow until first manual pick": the panel follows the recommendation
  until the player selects a phase, then stays put (sticky) with a visible "Recommended"
  strip + Follow button. Wheel labels and the mobile stepper are now controls.

**P0.2 — Wire echoes as real effects** — ✅ shipped

- Goal: make collected echoes actually change the colony and combat. Turns #8 into the real
  progression loop and directly feeds #7.
- Change:
  - New `packages/game-engine/src/echoes.ts`: resolve `acquiredEchoes` into bonus accessors
    (biomass multiplier, fire-rate, poison, dodge, skill-cost reduction, regen, …).
  - Fold into: `math.ts` `getEffectiveBiomassPerSec`, combat-stat assembly
    (`skills.ts` / combat), expedition reward/time (`expeditions.ts`), skill cost
    (`getSkillLevelCost`).
  - Surface the actual bonus on victory and on the Evolution page (today only labels show).
- Files: new `packages/game-engine/src/echoes.ts`, `math.ts`, `skills.ts`, `expeditions.ts`,
  `apps/web/src/routes/evolution/*`.
- Effort: ~2–3 days. Medium risk (touches balance via existing multipliers).
- Shipped: all 11 echoes now resolve through `getEchoEffects` and feed passive Biomass,
  spore fire rate/damage, poison, HP regen, movement speed, dodge window, evasion, and
  mutation costs. Arena (`pixi/radar.ts`) gained poison/move/dodge/evade support. Echo
  names + descriptions now render on the Evolution page. One description was reworded
  (raccoon: "Damage +15% against previously encountered hosts" → "Spores deal +15% damage")
  to match the implemented flat bonus.

**P0.3 — Resolve the idle promise** — ✅ shipped (offline catch-up)

- Goal: stop advertising a feature the game does not have.
- Change (see Open Decisions): either implement offline catch-up (`lastSavedAt` + capped
  accrual scaled by `dormant_spores`, with a "while you were away" summary) or drop the
  "idle" label and repurpose `dormant_spores`.
- Files: `apps/web/src/lib/stores/game.svelte.ts`, `packages/game-engine/src/offline.ts`,
  `packages/config/src/constants.ts`, `packages/config/src/skill-trees.ts`, docs.
- Effort: small if relabelled; ~2–3 days if implemented.
- Shipped as catch-up: saves stamp `lastSavedAt`; on load the elapsed gap (capped at 8h)
  is simulated at a base 50% rate, +25% per `dormant_spores` level (max 100%). Expeditions
  and trauma run in real time; stale contacts expire. A dismissible "Welcome back" summary
  reports Biomass gained and expeditions returned.

## Open decisions (resolved)

| #   | Decision                      | Resolution                                                              |
| --- | ----------------------------- | ----------------------------------------------------------------------- |
| O1  | Offline / idle framing        | Implemented offline catch-up (P0.3).                                    |
| O2  | Economy rework aggressiveness | **Gentle** — a slight metabolic drag only; no forced starvation (P1.1). |
| O3  | Echo scope                    | Implemented the 11 as written (P0.2); behavioural redesign deferred.    |
| O4  | Phase-selector stickiness     | Auto-follow until the first manual pick, then sticky (P0.1).            |

### P1 — design/balance, needs playtesting

**P1.1 — Economy: decisions instead of waiting (#4)** — ✅ shipped (gentle)

- Added metabolic upkeep scaling with network complexity (generator levels, echoes, cap
  expansions); `getUpkeepRate` / `getNetResourceRate` in `math.ts`.
- Gather panel now shows `produced · upkeep · net`; a 30-minute balance sim
  (`economy.balance.test.ts`) pins the maxed net to a gentle band and proves no early stall.

**P1.2 — Assimilation tradeoff clarity + payoff (#9)** — ✅ shipped

- Global ecological strain is now its own meter (`GLOBAL_STRAIN_PER_WIN`) separate from
  per-host echo progress; `combat.ts` no longer reuses the full `assimilationGained`.
- Grow panel shows "Ecological strain N% · passive −M%"; the Evolution page lists the
  aggregated active echo bonuses, so "complexity = lower raw efficiency, greater capability"
  is visible in numbers.

**P1.3 — First-30-minutes progressive disclosure (#11)** — ✅ shipped

- Core chain (Core, Hunt) leads after the tutorial; Evolution and Expeditions both reveal at
  the first echo (`systems.ts` `getSystemUnlocks`). An earlier `totalBiomassEarned ≥ 5` gate for
  Evolution was a no-op (the tutorial already exceeds 5), so it was replaced.
- Evolution is opened from the Evolve phase panel once unlocked; each reveal logs a one-time
  unlock toast; reactive overlay (also fixes `?skipintro`). See Phase 2 below. (The top-bar
  launcher buttons were later removed — Evolution keeps its panel entry.)

## Phase 1 — Economy tension + assimilation clarity (P1.1 + P1.2) — ✅ shipped

Approved direction: **gentle** metabolic upkeep (O2), with a deterministic balance
simulation to make tuning verifiable. Debt items are deferred to their own cleanup pass.

**Goal & tuning target.** Slow the snowball and make Synthesize a real choice without
starving semi-attended players. Maxed network net Water/Nutrient surplus drops from
`+9.2/s` to roughly `+6.5–7/s` per pool (~25–30% drag); passive Biomass stays clearly
positive; early generators stay net-positive.

**Mechanism — complexity upkeep.** A per-pool continuous drain derived from network size,
which also makes "more complexity = lower raw efficiency, greater capability" mechanical
rather than just copy:

```
upkeep(pool) = UPKEEP_PER_LEVEL     × (that pool's generator level)
             + UPKEEP_PER_ECHO      × acquiredEchoes.length
             + UPKEEP_PER_EXPANSION × capExpansions
```

Starting coefficients (sim-tuned): `UPKEEP_PER_LEVEL 0.1`, `UPKEEP_PER_ECHO 0.1`,
`UPKEEP_PER_EXPANSION 0.05`. Applied only when `gamePhase === 'active'`, so the tutorial
economy is untouched.

**Work breakdown**

- **E1 — Upkeep model + net-rate helper.** Constants in `packages/config/src/constants.ts`;
  `getUpkeepRate` / `getResourceProduction` / `getResourceDrain` / `getNetResourceRate` in
  `packages/game-engine/src/math.ts`; upkeep charged inside `tickIdle` (which also covers
  offline, since `offline.ts` calls `tickIdle`). Export from `index.ts`.
- **E2 — Gentle rebalance + balance sim.** New
  `packages/game-engine/src/economy.balance.test.ts`: deterministic 30-minute runs
  (idle-only, upgrade-rush, synth-spam) driving `tickIdle` + `purchaseGenerator` +
  `manualSynthesize`; assert maxed net lands in the target band, early game stays
  net-positive, and Biomass neither stalls nor explodes.
- **E3 — Surface net income.** Gather income summary shows
  `+X/s produced · −Y/s upkeep · = Z/s net`; `ColonyNucleus` displays the net rate.
- **E4 — Decouple global strain.** Add `GLOBAL_STRAIN_PER_WIN` (~2); `combat.ts` calls
  `applyDepletion(state, GLOBAL_STRAIN_PER_WIN)` instead of the full per-host
  `assimilationGained`, so the echo meter and the ecological meter are independent.
- **E5 — Clarity UI.** Core shows "Ecological strain N% · passive −M%" with the
  complexity explainer; Evolution lists active echo bonuses so the payoff visibly exceeds
  the penalty; Radar labels the contact meter `echo N/100`.
- **E6 — Tests, docs, verification.** Update tests touching `getEffectiveBiomassPerSec`,
  `applyDepletion`, `tickIdle`, and offline reports. Update `GAME-DESIGN.md` (Resources,
  Assimilation), `HANDOFF.md` §5 + §7, `DEV-NOTES.md`. Run the full gate.

## Phase 2 — Progressive disclosure (P1.3) — ✅ shipped

Approved direction: nav-gate + unlock toasts/badges; Expeditions unlock at the first echo;
locked tabs hidden; "already shown" state in `localStorage` (`mycosurge_reveals`).

**Trigger model.** `packages/game-engine/src/systems.ts` → `getSystemUnlocks(state)` returns
`{ radar, evolution, expeditions }` from **cumulative** counters (lifetime Biomass, echoes) so
a system never re-locks:

- `radar`: `gamePhase === 'active'` (core chain; tutorial route unaffected).
- `evolution`: `acquiredEchoes.length >= 1` (first host grown over).
- `expeditions`: `acquiredEchoes.length >= 1` (first host grown over).

**Work breakdown**

- **D1** `systems.ts` + `systems.test.ts` (engine) + `index.ts` export.
- **D2** `apps/web/src/lib/content/systems.ts` — `SYSTEM_META` (name/glyph/blurb/route/toast).
- **D3** store: `unlockedSystems`, `revealState` (`mycosurge_reveals`), `announceNewSystems`,
  `isSystemNew`, `markSystemSeen`, `skipIntro` reveal-all override, `resetGame` clears reveals.
- **D4** `+layout.svelte` top-bar launcher buttons filter on unlock and show a "New" badge.
  (Superseded — the launchers were removed; Evolution opens from the Evolve panel.)
- **D5** Evolution/Expeditions route guards + `markSystemSeen`.
- **D6** `PhaseDetailPanel` hides the Evolution CTA until unlocked.
- **D7** reactive overlay in `+page.svelte` (fixes no-remount + `?skipintro`); reworded copy.
- **D8** `+layout.svelte` effect announces new systems via the activity log.
- **D9** tests (`systems.test.ts`, `systems.test.ts` web content) + docs.

### P2 — later polish / arena

**P2.1 — Radar progressive intel (#10)**

- Add an `intel` level to `RadarContact` and hint strings
  (`UNKNOWN SIGNAL → MOTION SIGNATURE → LIKELY CLASS → exact`) that evolve over time or per
  ping.

**P2.2 — Cap expansion with behavioral unlocks (#5)**

- Give cap increases a felt capability ("you can now stay away longer") rather than `+10` only.

**P2.3 — Behavioral combat from mutations (#7)**

- Proliferation currently changes only numbers; add arena behaviours (summons / area control)
  in `apps/web/src/lib/pixi`.

## Verification (after each item)

```sh
pnpm check
pnpm lint
pnpm --filter @mycosurge/game-engine test
pnpm --filter web test
pnpm build
```

Update `HANDOFF.md`, `GAME-DESIGN.md`, and `DEV-NOTES.md` as items ship.
