# Mycosurge — UI Revamp

Status: **complete** (Phases 0–6). This records the direction and what landed; the
visual source of truth is `DESIGN.md`.

## Direction — Bio-Luminal Lab

A friendly scientific-instrument look that keeps the fungal-biology identity. Dark moss
surfaces, bioluminescent mint/cyan/amber/coral semantics, Space Grotesk UI + JetBrains
Mono data, 6–12px radii, subtle motion. Full token set in
`packages/design-system/src/tokens.css`.

## Phase 0 — Design foundation

- Rewrote `packages/design-system/src/tokens.css` (palette, type, radius, shadow, motion).
- Rewrote `DESIGN.md`; updated `AGENTS.md`.
- Font import in `apps/web/src/app.css`.
- Mockups in `stitch-output/bioluminal/` (onboarding, generators, Core, combat).

## Phase 1 — Onboarding FTUE

- `apps/web/src/lib/content/onboarding.ts` (steps, copy, generator content, unlock cards).
- Components: `ObjectiveBanner`, `ProgressBar`, `SystemsUnlocked`, `CountUp`.
- `TutorialIntro.svelte` staged flow: Feed → Grow → Automate → Expand → threat handoff,
  with one action per step, locked-with-reason controls that flash on unlock, and a
  count-up Biomass readout with a lifetime "harvested" total.
- `absorbResources` clamps to the resource caps.

## Phase 2 — Structure & legibility

- Unified navigation (Core / Radar / Evolution / Expeditions) and fixed active-tab logic.
- Route guards: Evolution and Expeditions redirect home until the full game is unlocked.
- Empty states; functional expedition launch/collect.
- Plain-language copy throughout; no command-style prefixes.

## Phase 3 — Screen redesign

- Core, Radar, Evolution, Expeditions, and Combat moved to the Bio-Luminal Lab system
  (rounded/elevated panels, token colours, graphical bars, plain labels).
- Pixi arena redrawn with shapes (coral host tiles with name glyph, mint player with glow,
  pill spores and dot pellets) over a mint grid + radial glow.
- Combat overlay: objective banner, `● HOSTILE` chip, live host and player HP bars, shield
  counter, control hint.
- Mockup-fidelity pass against `stitch-output/bioluminal/03-core-unlocked.html` and
  `04-combat.html`.
- `getGeneratorCost` honours each definition's `costScale`.

## Phase 4 — Voice & polish

- Friendly copy across engine strings and store logs.
- Accessibility/tap targets: `:focus-visible` rings, ≥40px controls, modal focus trap and
  Escape handling, labelled status cues, `aria-live` activity log, canvas `aria-label`.
- `CountUp` honours `prefers-reduced-motion`.
- Web unit tests for onboarding content; `?skipintro` QA flag.
- Full verification (check / lint / build / engine + web tests).

## Phase 5 — Review follow-ups

Correctness fixes surfaced by review:

- Combat reward plumbing (the panel shows the real reward), `Expand Biomass` actually
  raises the effective cap, over-cap rewards are preserved, alert level decays, skill
  prerequisites match the engine, all twelve attack patterns are implemented, and combat
  stats (hitbox, resistance, regen, chain reaction) are wired to the arena.
- Copy/voice, design/a11y, and cleanup passes.

## Phase 6 — Stitch palette revamp

Adopted the brighter **Stitch** palette (from the Growth Cycle mockup) across the app,
replacing the original muted Bio-Luminal tones. Because the app is token-driven, this was
almost entirely a token swap.

- `packages/design-system/src/tokens.css`: new palette — mint `#70fdc3` (primary),
  cyan `#68d6e3`, amber `#f5c055`, coral `#ffb4ab`, on deep-moss surfaces
  `#0e1513 / #161d1b / #1a211f / #242b29 / #2f3634`, borders `#3c4a42`, text
  `#dde4e0 / #bbcac0`. Non-Material names mapped to match the look (`border`, `warning`,
  `alert/error`, `success`, `overlay`, `primary-glow`).
- `apps/web/src/lib/pixi/constants.ts` + `radar.ts`: arena background/grid/player/host
  colours and the radial glow updated to the new tones.
- `apps/web/src/lib/components/TutorialIntro.svelte`: unlock-glow fade updated.
- `DESIGN.md`: frontmatter + prose palette updated.
- Fonts unchanged (Space Grotesk + JetBrains Mono).

Only the **palette** changed; the Core _layout_ revamp is scheduled separately in
`GROWTH-CYCLE-LAYOUT-PLAN.md`.

## Verification

```sh
pnpm check
pnpm lint
pnpm --filter @mycosurge/game-engine test
pnpm --filter web test
pnpm build
```

Reset onboarding: clear `localStorage` keys `mycosurge_save` and `mycosurge_unlock_seen`
(or use the top-bar Reset button). `?skipintro` jumps straight to the full game.
