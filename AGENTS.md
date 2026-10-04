# Mycosurge — Agent Guide

Mycosurge is a browser incremental/idle game with real-time bullet-hell combat. You grow a
fungal network: harvest Water and Nutrients, synthesize Biomass, install generators, expand and
evolve, and fight hosts in a Pixi.js arena. This file is the fast orientation for contributors
and coding agents.

## Commands (run from repo root)

| Command                   | What it does                              |
| ------------------------- | ----------------------------------------- |
| `pnpm dev`                | Start all dev servers (Turbo)             |
| `pnpm build`              | Build all packages + app                  |
| `pnpm lint`               | Prettier check across repo                |
| `pnpm check`              | TypeScript + Svelte type checking (Turbo) |
| `pnpm format`             | Format all files with Prettier            |
| `pnpm --filter web check` | Svelte-check only (fastest type check)    |
| `pnpm --filter web test`  | Web unit tests (Vitest)                   |

Focused checks from a package directory:

- `cd apps/web && npx vitest run` — web unit tests
- `cd packages/game-engine && npx vitest run` — game-logic tests
- `cd apps/web && npx svelte-check --tsconfig ./tsconfig.json` — Svelte diagnostics

## Branching

Default working branch is **`develop`** (tracking `origin/develop`); `main` is the release
line. Branch off `develop` and push/PR back into it.

## Monorepo Structure

```
mycosurge/
├── apps/web/          # SvelteKit 5 SPA (ssr=false, prerender=true)
│   └── src/
│       ├── lib/
│       │   ├── components/  # Overlay, CombatModal, TutorialIntro, ActivityLog, hunt/, panels/…
│       │   ├── content/     # Onboarding steps/copy
│       │   ├── pixi/        # Pixi.js v8 bullet-hell arena engine
│       │   └── stores/      # Svelte 5 rune-based stores (game, log, ui)
│       └── routes/          # / (Core) only — systems open as overlays, not routes
├── packages/
│   ├── config/              # Constants, hosts, generators, upgrades, skill trees (pure TS)
│   ├── game-engine/         # Combat, expeditions, math, skills (pure TS, depends on config)
│   └── design-system/       # CSS tokens + @theme block (CSS only, no build step)
```

## Framework & Toolchain Quirks

- **Svelte 5 runes**: use `$state()`, `$derived`, `$props()`, `$effect()` — NOT Svelte 4 `$:` or
  `export let`.
- **Tailwind CSS v4**: CSS-first config via the `@theme` block in
  `packages/design-system/src/tokens.css`. There is no `tailwind.config.js`.
- **Design tokens** live in `@mycosurge/design-system`, imported via
  `@import "@mycosurge/design-system"` in `app.css`. Use `var(--primary)`, `var(--surface)`, etc.
  in component styles; Tailwind utilities like `bg-primary`, `text-alert`, `border-border` also
  resolve.
- **SPA mode**: `+layout.ts` sets `ssr=false`, `prerender=true`, `trailingSlash='always'`.
- **Build order**: `config → game-engine → design-system → web` (Turbo handles via `dependsOn`).
- **Persistence**: game state auto-saves to `localStorage` key `mycosurge_save` every tick. The
  one-time post-tutorial overlay uses `mycosurge_unlock_seen`.
- **Pixi arena**: a 500×500 logical canvas scaled to fit its container. Keyboard (WASD/arrows) and
  touch-drag input; spores auto-fire. Entities are drawn as shapes (coral host tiles, mint player
  with glow, pill spores, dot pellets), not ASCII. Twelve attack patterns drive hosts — see
  `COMBAT.md`.
- **ESM only**: all packages are `"type": "module"`.

## Style & Convention

- **Bio-Luminal Lab**: friendly scientific-instrument look. Rounded corners (6–12px), subtle
  shadows/motion, Space Grotesk UI font + JetBrains Mono for numbers, graphical progress bars
  (mint/cyan/amber/coral semantics). Full spec in `DESIGN.md`.
- **Copy voice**: plain verbs first, flavour second. No `> EXE:` / `SYS:` prefixes; no
  "neutralize"/"assimilate" in player-facing copy.
- **Buttons**: the shared `.cmd-btn` pattern (design-system) — enabled actions fill with
  their action colour (`--primary` by default, `.secondary` for neutral/nav, `.danger` for
  destructive); disabled buttons are strictly greyed out. Never let an enabled control look
  disabled, or vice versa.
- **Panel headers**: `text-label-caps`.
- **Formatted with Prettier**: `semi: true`, `singleQuote: true`, `tabWidth: 2`, `printWidth: 100`.
- **Responsive breakpoint**: 768px. Mobile is a single-column stack; desktop adds the sidebar.

## Testing

- Vitest with glob patterns: `src/**/*.{test,spec}.{js,ts}`.
- `packages/game-engine` covers math, skills, expeditions, and tutorial logic.
- `apps/web` covers onboarding content; components are exercised via `svelte-check` and the dev
  server.

## Related docs

- `DESIGN.md` — visual design system (Bio-Luminal Lab).
- `GAME-DESIGN.md` — game design and systems.
- `COMBAT.md` — arena/bullet-hell specification.
- `DEV-NOTES.md` — dev/QA notes and known debt.
- `UI-REVAMP-PLAN.md` — the UI revamp plan and status.
- `RADAR-ECONOMY-PLAN.md` — sonar/tier-unlock + economy rework (radar contacts, strains).
- `ASSET-PLAN.md` — 2D asset priority plan + Google AI Studio workflow (`PROMPTS.md`).
- `GROWTH-CYCLE-LAYOUT-PLAN.md` — scheduled Core layout revamp (growth-cycle wheel).
