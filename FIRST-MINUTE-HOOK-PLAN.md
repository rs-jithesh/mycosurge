# First-Minute Hook — Plan

Status: **in progress** — Phases 1–2 implemented; Phases 3–5 pending.

## Context

Depth is for retention, juice is for first contact — the game needs both, in that
order. Today most of the design is mid-game: the onboarding is a solid four-step
tutorial, but it opens with a wall of panels and static numbers, and the richest
asset (the network you can watch spread) only appears late.

Audit of the current first run (`packages/game-engine/src/tutorial.ts`,
`apps/web/src/lib/components/TutorialIntro.svelte`):

| Brief requirement             | Today                                                                                        | Gap                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Immediate action + result     | `Absorb` gives +1 Water/+1 Nutrients, shown as static text; nothing visibly grows             | No rolling numbers, no growth, copy read before play             |
| New unlock every 5–10 s       | First synthesis = 10 taps; first generator = 2 Biomass (~25–30 taps); 4 steps total            | Cadence slow and lumpy                                           |
| Goal visible and close        | Banner states "spend 10 + 10", not a live "N more" delta                                       | Delta is never counted down                                      |
| First reveal in ~2 min        | No sensed blip before the full game; radar only spawns once a host is catalogued              | Missing entirely                                                 |
| Growth you can see            | Network is a hidden `ProgressBar` shown only on step 4; the radial map is full-game only       | No visible spread in minute one                                  |

Assets that already exist: `CountUp.svelte` (rolling numbers, reduced-motion aware)
and the SVG hyphae rendering in `map/MapOverlay.svelte` (`generateNetwork`, hyphae
segments, sensed-blip styling) that can seed a much simpler bloom.

## Principles

- **Juice for first contact:** one tappable organism, numbers that move, growth you
  can see, a goal always a few seconds away.
- **Depth unlocks in order:** first one undirected direction → sectors → signals →
  cords. No sectors, directions, or radar-flavoured UI before the first hunt.
- **Generous early curve:** the real cost curves begin only once the loop is learned.

### The trap (guardrail)

Do not open with the six-sector map, signals, or directional choices. The early
reveal is a single undirected pulse at the bloom's edge — **not** a `MapOverlay`
contact and **not** the sector map. `getSystemUnlocks()` continues to gate Radar to
`active`, Evolution to the first defeat, and sectors/cords to the full game.

## Target first five minutes

| Time      | Player does        | Unlock / reveal                          | Curve (hook)                      |
| --------- | ------------------ | ---------------------------------------- | --------------------------------- |
| 0:00–0:30 | Taps the spore     | Water/Nutrients roll up                  | Absorb +2, cap 10 → synth in ~5 t |
| 0:30–1:30 | Shapes Biomass     | Generator #1, then #2                    | 1 Biomass each                    |
| 1:30–2:30 | Extends reach      | Bloom branches; **faint blip sensed**    | 1 Biomass per mm                  |
| 2:30–4:00 | Fights nematode    | Lysate burst; full game begins           | existing tutorial handoff         |
| 4:00–5:00 | Hits a cap         | Learns cap → upgrade → return            | full-game curves take over        |

## Work breakdown

### Phase 1 — Engine: hook track + generous curve (implemented)

- [x] **H1** New `packages/game-engine/src/hook.ts`: an ordered hook objective track
      (`HOOK_OBJECTIVES`, `getNextHookObjective`, `getHookProgress`) with a live
      `{ current, target, unit }` delta for the always-close goal chip, plus
      `isSignalSensed` / `SENSE_REACH_THRESHOLD` / `SENSE_REACH_RESOLVE` for the
      first reveal. Pure and unit-tested (`hook.test.ts`).
- [x] **H2** Generous early curve in `tutorial.ts`: `TUTORIAL_ABSORB_AMOUNT = 2`,
      `TUTORIAL_GENERATOR_COST = 1`, `TUTORIAL_EXTEND_COST = 1`, named synthesis
      costs; the early reserve cap now lifts at `TUTORIAL_GENERATOR_COST`.
- [x] **H3** Wire copy/constants: `content/onboarding.ts` imports the engine costs
      (single source of truth), `resolveTutorialStep` uses the new generator cost,
      and the absorb/generator copy reflects +2 / 1 Biomass.
- [x] **H4** Engine tests updated/added (`tutorial.test.ts`, `hook.test.ts`); web
      content tests kept green.

### Phase 2 — Colony bloom + number juice

- [x] **H5** `ColonyBloom.svelte`: a small SVG organism (central spore + five hyphae with
      side branches) that unfurls as progress grows, with a light pulse travelling along
      each hypha and a burst ring on purchase. Present from t=0 as a tiny spore.
      Undirected — no wedges. Reduced-motion aware.
- [x] **H6** Replace the hidden `Network` `ProgressBar` with the bloom (always visible in
      the tutorial), with a live `X / 5 mm` caption. A faint sensed blip pulses at the
      frontier once `isSignalSensed` is true.
- [x] **H7** Juice: Water/Nutrients/Biomass readouts roll via `CountUp` (`ProgressBar`
      gained an `animate`/`format` option); per-resource production rate line
      (`+1.0/s`, halved in shock); a "+2" pop on tap; burst on synthesize/install/extend.
      The bloom grows with overall progress (reserves + generators + network), not just mm.

### Phase 3 — Hook UI: one obvious action, goal always close

- [ ] **H8** `NextGoalChip.svelte` from `getHookProgress` — e.g. *"3 more Water →
      shape Biomass"*, updating live.
- [ ] **H9** Step 1 becomes the bloom as the tap target with one short line of copy;
      long descriptions move behind the chip. Reveal panels progressively instead of
      showing every locked control.

### Phase 4 — First reveal + handoff + return

- [ ] **H10** At `SENSE_REACH_THRESHOLD`, pulse a sensed blip at the bloom's edge
      (dashed `--secondary`, reusing `.contact .pulse`) with one log line. Keep the
      `HuntSection mode="tutorial"` → nematode handoff as the resolution at 5 mm.
- [ ] **H11** Guarantee a warm first-return report for tutorial-completed saves
      (`offline.ts`, `WelcomeBackDialog.svelte`).

### Phase 5 — Balance, QA, docs

- [ ] **H12** Playtest the exact tap counts / time-to-unlock; optionally seed a start
      reserve (a tuning knob, not yet implemented).
- [ ] **H13** Update `GAME-DESIGN.md` §Onboarding and this plan's status.

## Decisions

- **New bloom component, not an early `MapOverlay` mode.** The map is sector-shaped
  and is exactly the trap; sectors/cords stay full-game.
- **Retune the existing tutorial and add the objective track**, rather than build a
  parallel onboarding system. `gamePhase` stays as the coarse gate.
- **Reveal is derived, not persisted.** `isSignalSensed` reads `mycelialNetwork`, so
  there is no save migration for the new hook.
- **Single source of truth for hook costs** lives in the engine
  (`tutorial.ts`); web content re-exports rather than duplicating.

## Verification

```sh
pnpm check
pnpm lint
pnpm --filter @mycosurge/game-engine test
pnpm --filter web test
pnpm build
```

Manual: reset progress (top-bar Reset or clear `mycosurge_save` / `mycosurge_unlock_seen` /
`mycosurge_reveals`), check `?skipintro`, portrait mobile, and reduced-motion.
