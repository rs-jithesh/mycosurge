---
name: Clinical Brutalist Terminal
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c6'
  primary: '#fdfdfc'
  on-primary: '#2f3131'
  primary-container: '#e0e0e0'
  on-primary-container: '#626363'
  inverse-primary: '#5d5f5f'
  secondary: '#c7c6c6'
  on-secondary: '#303031'
  secondary-container: '#464747'
  on-secondary-container: '#b6b5b5'
  tertiary: '#fffbff'
  on-tertiary: '#342f2d'
  tertiary-container: '#e7deda'
  on-tertiary-container: '#67615e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#eae1dd'
  tertiary-fixed-dim: '#cdc5c1'
  on-tertiary-fixed: '#1f1b19'
  on-tertiary-fixed-variant: '#4b4643'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  alert-critical: '#cc3333'
  player-core: '#ffffff'
  structural-border: '#333333'
typography:
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0.05em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  panel-padding: 16px
---

## Brand & Style

The design system is rooted in **Clinical Brutalism**, simulating a raw, high-stakes laboratory terminal interface. The aesthetic is intentionally unrefined and utilitarian, evoking the sensation of interacting with a restricted biological surveillance system.

The primary design movement is **Brutalism**, characterized by its lack of ornamentation, total absence of curves, and high-contrast monochrome execution. There is no depth, no glow, and no transitions; interactions are instantaneous and binary, reinforcing a cold, systemic atmosphere where efficiency and data accuracy are the only priorities.

## Colors

The color palette is strictly functional and monochromatic.

- **Primary Background:** Nearly pure black (`#050505`) to create a "void" effect that minimizes eye strain during high-density combat.
- **Primary Text/UI:** Off-white (`#e0e0e0`) is used for primary interactions and active states.
- **Secondary/Dim:** Mid-gray (`#666666`) is reserved for inactive elements, background data, and passive logs.
- **Alert:** Red (`#cc3333`) is the only chromatic element, used exclusively for trauma warnings, host immune responses, and incoming threats.
- **Player Core:** Pure white (`#ffffff`) is reserved strictly for the player's representation on the radar.

Color is never used for aesthetic flair—only for conveying status and immediate danger.

## Typography

The typography system relies exclusively on **JetBrains Mono**. As a monospaced typeface, it ensures that numerical data and tabular layouts align perfectly, supporting the "data terminal" aesthetic.

- **Uppercase Dominance:** All structural UI elements, including buttons, headers, and labels, must be rendered in ALL CAPS.
- **Tabular Figures:** Monospacing is used to align columns of resources and statistics vertically.
- **Instant Snap:** There are no weight or size transitions. Changes in hierarchy are conveyed through weight shifts (400 to 700) or color dimming.

## Layout & Spacing

The layout follows a **Fixed Grid** model that simulates a physical terminal screen. Content is contained within strict panels and sectors rather than a fluid web-flow.

- **Grid:** A 12-column grid is used for desktop, while mobile uses a single-column stack. Both versions maintain identical styling and density.
- **Gutters:** 16px solid gaps separate data panels.
- **Rhythm:** Spacing is strictly based on a 4px increment system.
- **Radar Canvas:** The central gameplay area is a fixed aspect-ratio canvas that remains centered, surrounded by data panels.

## Elevation & Depth

This design system uses **zero depth**. There are no shadows, no gradients, and no semi-transparent layers.

- **Flat Hierarchy:** Hierarchy is established through **Bold Borders** (1px solid lines) and tonal contrast between the background and primary/secondary text.
- **Inversion:** Elevation/Interaction is signaled by inverting the colors. On hover or selection, the background and foreground colors swap instantly.
- **Grid Lines:** A subtle dotted or 1px intersection grid (`#111111`) may be used in the background of the radar canvas to provide a sense of scale without adding depth.

## Shapes

The shape language is strictly **Sharp**.

- **Border Radius:** All elements must have a `0px` border-radius.
- **Dividers:** Use 1px solid lines to separate content within panels.
- **Icons:** Icons should be avoided in favor of ASCII characters or simple geometric shapes (e.g., `[+]`, `[x]`, `>`).

## Components

### Buttons

Buttons are designed to look like command-line executions.

- **Style:** 1px solid border, transparent background, uppercase text.
- **Prefixes:** Every button must include a functional prefix: `> EXE:`, `SYS:`, or `SUDO:`.
- **States:** Hover and Active states must **snap** instantly to an inverted color scheme (Background: `#e0e0e0`, Text: `#050505`).

### Progress Bars

Avoid all standard HTML progress elements. Progress must be represented using ASCII blocks.

- **Format:** `[██████░░░░░░░░]`
- **Filled Segment:** `█` (U+2588 Full Block)
- **Empty Segment:** `░` (U+2591 Light Shade)

### Panels

Containers for data and controls.

- **Border:** 1px solid `#333333`.
- **Header:** Titles sit flush at the top of the panel, separated by a 1px divider or a slightly lighter background (`#0a0a0a`).

### Input Fields & Controls

- **Inputs:** Simple text underlines or 1px boxes with a blinking cursor `_`.
- **Checkboxes/Radios:** Use `[X]` for selected and `[ ]` for unselected states.

### Scrollbars

Browser-native scrollbars are hidden or replaced with a minimal custom track.

- **Track:** `#050505`
- **Thumb:** `#333333` (sharp corners, no radius).
