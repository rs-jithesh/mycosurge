---
name: Bio-Luminal Lab
colors:
  background: '#0e1513'
  surface: '#161d1b'
  surface-dim: '#0e1513'
  surface-bright: '#333b38'
  surface-container-lowest: '#09100e'
  surface-container-low: '#161d1b'
  surface-container: '#1a211f'
  surface-container-high: '#242b29'
  surface-container-highest: '#2f3634'
  surface-variant: '#2f3634'
  on-surface: '#dde4e0'
  on-surface-variant: '#bbcac0'
  border: '#3c4a42'
  outline: '#86948b'
  outline-variant: '#3c4a42'
  primary: '#70fdc3'
  on-primary: '#003826'
  primary-container: '#4fe0a8'
  on-primary-container: '#006043'
  primary-fixed-dim: '#4ddea6'
  secondary: '#68d6e3'
  on-secondary: '#00363c'
  secondary-container: '#1f9fac'
  tertiary: '#ffe0ac'
  on-tertiary: '#412d00'
  tertiary-container: '#f5c055'
  warning: '#f5c055'
  success: '#70fdc3'
  danger: '#ffb4ab'
  alert: '#ffb4ab'
  error: '#ffb4ab'
  player-core: '#f2fff9'
  inverse-surface: '#dde4e0'
  inverse-on-surface: '#2b322f'
typography:
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0px
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  panel-padding: 16px
shape:
  radius-sm: 6px
  radius-md: 8px
  radius-lg: 12px
  radius-pill: 999px
motion:
  duration-fast: 140ms
  duration-normal: 220ms
  ease: cubic-bezier(0.22, 1, 0.36, 1)
---

## Brand & Style

**Bio-Luminal Lab** is a friendly scientific-instrument aesthetic for a game about
a fungal network growing through a substrate. It keeps the original science-fiction
biology identity — dark, atmospheric, data-dense — but replaces the harsh cryptic
terminal with something a new player can read at a glance.

The core tension: the game is about a cold, invasive organism, but the _interface_
should feel like a well-labelled instrument, not a restricted command line. Flavor
text still carries the ecological-horror tone; every control the player must use is
plain-language first.

Three principles drive the visual language:

1. **Legible first.** Every actionable control has a plain verb; flavor is secondary.
2. **Softened, not softened-to-death.** Rounded corners, gentle motion, and a single
   accent family replace the hard 0 radius / no motion brutalism — but density and
   tabular data remain.
3. **Light is information.** Bioluminescence is meaningful: mint = your growth,
   cyan = secondary/neutral data, amber = attention/progression, coral = danger.

## Colors

The palette is a dark moss field with bioluminescent accents. Color is never
decorative — each hue has a job.

- **Background / Surfaces:** Deep moss-black (`#0e1513`) through raised container
  tones (`#2f3634`). Panels sit on `surface` (`#161d1b`) with a `border` hairline
  (`#3c4a42`); elevation is signalled by surface tone and a soft shadow, not by heavy
  lines alone.
- **Primary (Bio-Mint `#70fdc3`):** Your organism, growth, success, primary actions.
  Filled primary buttons use `on-primary` (`#003826`) text.
- **Secondary (Cyan `#68d6e3`):** Secondary data, neutral highlights, water/sensor.
- **Tertiary / Warning (Amber `#f5c055`):** Attention, progression, next-step cues,
  caution that is not immediate danger.
- **Alert / Danger (Coral `#ffb4ab`):** Trauma, hostile contact, resource starvation.
  The only high-urgency chroma.
- **Text:** `on-surface` (`#dde4e0`) for primary copy, `on-surface-variant`
  (`#bbcac0`) for supporting and disabled copy.

## Typography

Two families, each with a clear role.

- **Space Grotesk (UI):** Headings, labels, buttons, body copy. Friendly and
  geometric while still technical.
- **JetBrains Mono (Data):** All numbers, counters, resource values, timers, and
  tabular data. Monospacing keeps columns aligned.

Rules:

- **Labels** use `.text-label-caps` (11px / 600 / 0.08em / uppercase) for section
  headers and status tags.
- **Numbers** use `.text-data-mono` with `font-variant-numeric: tabular-nums`.
- Hierarchy is conveyed through size and weight; motion is subtle, never flashy.

## Layout & Spacing

A responsive, panel-based layout. Mobile is the primary target (bullet-hell combat is
touch-driven); desktop adds a persistent sidebar.

- **Grid:** Single-column stack on mobile (< 768px); two columns on desktop (sidebar
  navigation | content), with content capped to a readable width.
- **Spacing:** Strict 4px base scale. Panel padding 16px, gutters 16px, margins 24px.
- **Combat:** the arena opens as a full-screen overlay above the page — a centred,
  fixed-aspect Pixi canvas with an objective banner, host and player HP bars, and a
  control hint. The Radar page itself is a list of scannable hosts.

## Elevation & Depth

Depth is present but restrained.

- **Panels:** 1px `border` stroke, `surface` fill, `--radius-md` (8px) corners.
  Raised/active panels may add `--shadow-sm`.
- **Inversion & fill:** Interaction is signalled by filling a control with the
  primary color and switching text to `on-primary`, with a 140ms ease-out transition.
- **Allowed:** soft shadows, rounded corners, subtle grid lines in the arena,
  gentle motion. **Avoid:** gradients used as decoration, glassmorphism, glow baths.

## Shapes

- **Radius:** `radius-sm` 6px (buttons, inputs), `radius-md` 8px (panels, cards),
  `radius-lg` 12px (modals, large containers), `radius-pill` for status tags/badges.
- **Dividers:** 1px solid `border` lines separate content within panels.
- **Icons:** Prefer simple geometric marks and a small set of glyphs (`≋`, `✦`, `◆`,
  `▶`, `◎`). Glyphs are flavour only — never the sole carrier of meaning; pair them
  with a text label.

## Components

### Buttons

Enabled actions are **filled with their action colour**; disabled controls are
**strictly greyed out**. The state must be unmistakable at a glance.

- **Primary (default `.cmd-btn`):** Filled `primary` with `on-primary` text; hover /
  active use `primary-fixed-dim`. Used for actions the player can take.
- **Secondary (`.cmd-btn.secondary`):** transparent fill, 1px `outline` border,
  `on-surface` text; hover tints `surface-container-high` with a primary border and
  text. Used for neutral / navigation actions (Dismiss, Open Radar, Retreat).
- **Danger (`.cmd-btn.danger`):** transparent fill, `alert` border/text; hover fills
  `alert`. Used for destructive / cancel actions (Reset).
- **Disabled (any variant):** `surface-container` fill, `border` border,
  `on-surface-variant` text, reduced opacity, `not-allowed` cursor, no shadow, and no
  hover response. Enabled and disabled never share a look.
- **`.cmd-btn`** is the shared control pattern for all variants.
- **Labels:** plain verbs only — no `> EXE:` / `SYS:` command prefixes.
- Transitions are 140ms ease-out.

### Progress Bars

- Graphical bars with `radius-pill` ends. Track uses `surface-container-high`; fill
  uses the semantic colour. Water is `secondary` (cyan), Nutrients are `nutrient`
  (violet), Biomass/progress is `primary` (mint) or `warning` (amber), and danger is
  `alert` (coral). Mono numerals render the value beside the bar (e.g. `72 / 100`).

### Panels

- Containers for data and controls: 1px `border`, `surface` fill, `radius-md`.
- Headers sit flush at the top, separated by a 1px divider; header text uses
  `.text-label-caps` in `on-surface-variant` or `primary`.

### Status Tags & Badges

- Pill-shaped, small, uppercase. Mint = positive/owned, amber = attention/locked
  info, coral = danger.

### Input Fields & Controls

- 1px `border`, `surface-container` fill, `radius-sm`, `on-surface` text.
- All interactive controls have a `:focus-visible` ring in `primary`.

### Scrollbars

- Track `background`, thumb `border` with pill radius, hover `secondary`.

## Motion

- Micro-interactions: 140ms ease-out. Panel/step reveals: 220ms ease-out.
- Motion communicates state change (a value ticked, a step completed, a panel
  revealed), never decoration.
- **Accessibility:** All motion is disabled under `prefers-reduced-motion: reduce`.
