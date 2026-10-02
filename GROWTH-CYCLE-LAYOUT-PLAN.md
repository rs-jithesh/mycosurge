# Growth Cycle Layout — Follow-up Plan

Status: **implemented**. The theme revamp (Phase 6) and the Core layout change are both
shipped. See the work breakdown below and the notes at the end for deferred polish.

## Context

The palette now matches the approved **Bio-Luminal Lab (Stitch)** scheme: mint
`#70fdc3`, cyan `#68d6e3`, amber `#f5c055`, coral `#ffb4ab` on deep-moss surfaces, with
Space Grotesk + JetBrains Mono. This follow-up changes the **Core layout**: from the
current stacked panels to a circular **growth cycle** (the design the team preferred).

The palette half of this is already shipped (see `UI-REVAMP-PLAN.md` → Phase 6). This
plan is only the **layout** change.

### References

Mockups (local):

- **Theme-correct target:** `stitch-output/bioluminal/core-redesign/core-growth-cycle-tokened.html`
  (+ `.png`) — the version recolored to our exact tokens.
- Original Stitch render (brighter palette): `core-growth-cycle.html` / `.png`.
- The other concept for comparison: `core-living-colony.html` / `.png`.
- Palette source of truth: `packages/design-system/src/tokens.css`; visual spec in
  `DESIGN.md`.

Stitch:

- Project **Mycosurge — Bio-Luminal Lab** — `projects/17581346757248827668`
- Growth Cycle screen — `projects/17581346757248827668/screens/84908914a44e49c5a13494426bb1d442`
- Design system asset **Bio-Luminal Lab** — `assets/5285153273454364989`
- Note: Stitch `edit_screens` / `generate_variants` were timing out (`MCP -32001`);
  the theme-correct mock was produced by recoloring the exported HTML locally (see the
  one-off script under the session temp dir; mapping is documented in Phase 6). Re-run
  Stitch recreations later once the service is responsive.

Game systems referenced by the wheel live in `packages/game-engine/src/{radar,manual,combat,math}.ts`
and `apps/web/src/lib/stores/game.svelte.ts`.

## Goal

A desktop-first Core built around one circular figure:

- **The wheel:** four arcs — **Gather → Grow → Hunt → Expand** — looping back to Gather.
  The active arc and its label light up; the rest stay dim. Clicking a label inspects that
  phase; a "Next step" hint marks the suggested one, with "Resume auto" to clear the pick.
- **Center:** the colony organism, showing Biomass and passive rate (coral note when
  starving).
- **"Now" detail panel** beside the wheel: the resources and actions for the active
  phase, so the wheel gives order and the panel gives depth.
- **Activity feed** along the bottom.

## Phase → system map

| Phase      | Systems shown in the detail panel                                        |
| ---------- | ------------------------------------------------------------------------ |
| **Gather** | Water / Nutrients meters, **Absorb**, passive-income summary             |
| **Grow**   | Biomass meter + rate, **Synthesize**, generators + upgrades              |
| **Hunt**   | Radar contacts (scan / ping / engage), Lysate bank, Expeditions          |
| **Expand** | Lysate bank, cap expansion (`+10 cap · N Lysate`), Evolution (mutations) |

Note: capacity expansion lives **only** in the Expand panel (single source of truth);
Gather shows the meters and a read-only income summary that points at Grow.

## Work breakdown

- [x] **G1** Phase model: `packages/game-engine/src/phase.ts` (`getRecommendedPhase`,
      `getCheapestGeneratorCost`, `getCheapestExpandCost`), exposed as
      `gameStore.recommendedPhase`; unit-tested in `phase.test.ts`.
- [x] **G2** `GrowthCycleWheel.svelte`: four tinted SVG arcs (active lit, suggested dashed),
      node dots, phase-label buttons, orbit ring, center nucleus slot.
- [x] **G3** `PhaseDetailPanel.svelte`: per-phase controls — Gather (meters + Absorb +
      income), Grow (Biomass/Synthesize/generators), Hunt (contacts/Lysate/ping/engage),
      Expand (cap rows + Evolution).
- [x] **G4** Core route composed as wheel + detail column + Activity panel; shell kept.
- [x] **G5** Mobile: wheel hidden, compact ColonyNucleus + 4-stop stepper; detail stacks.
- [x] **G6** Docs + verification (engine 89/89, web 7/7, check 0/0, lint, build).

## Decisions

- **No manual override:** the wheel and detail panel always follow the engine's
  recommended phase. Phase labels and the mobile stepper are read-only indicators
  (no "Resume auto" / "Inspecting" state).
- **Nav rail vs wheel:** the left nav rail stays; the wheel is informational.
- **Activity feed:** desktop keeps the right-column Activity panel; mobile uses the shared
  bottom log from the layout.
- **Marker:** no separate pointer dot — the active arc + label glow serves as the marker.

## Deferred polish (known, non-blocking)

- On mobile the hidden wheel still mounts the non-compact `ColonyNucleus` (off-screen
  `CountUp`); harmless, could gate on a media query.
- Phase selection could use `role="tablist"`/`radiogroup` semantics instead of `aria-pressed`.
- The post-tutorial unlock overlay is captured at `onMount`, so it can be skipped if the
  tutorial completes without a remount (pre-existing).

## Effort

~2–4 days (new components + interaction), separate from the completed theme swap.
