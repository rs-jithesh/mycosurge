# Mycosurge — Agent Guide

## Commands (run from repo root)

| Command                   | What it does                              |
| ------------------------- | ----------------------------------------- |
| `pnpm dev`                | Start all dev servers (Turbo)             |
| `pnpm build`              | Build all packages + app                  |
| `pnpm lint`               | Prettier check across repo                |
| `pnpm check`              | TypeScript + Svelte type checking (Turbo) |
| `pnpm format`             | Format all files with Prettier            |
| `pnpm --filter web check` | Svelte-check only (fastest type check)    |

Run focused checks from the package directory:

- `cd apps/web && npx vitest run` — web unit tests
- `cd packages/game-engine && npx vitest run` — game logic tests
- `cd apps/web && npx svelte-check --tsconfig ./tsconfig.json` — Svelte diagnostics

## Monorepo Structure

```
mycosurge/
├── apps/web/          # SvelteKit 5 SPA (ssr=false, prerender=true)
│   └── src/
│       ├── lib/
│       │   ├── components/  # Svelte components (Sidebar, Nav, ChatPanel, etc.)
│       │   ├── pixi/        # Pixi.js v8 bullet-hell radar engine
│       │   └── stores/      # Svelte 5 rune-based stores (game, log)
│       └── routes/          # 4 routes: /, /radar, /evolution, /expeditions
├── packages/
│   ├── config/              # Game constants, host defs, skill trees (pure TS)
│   ├── game-engine/         # Game logic: combat, expeditions, math (pure TS, depends on config)
│   └── design-system/       # CSS tokens + @theme block (CSS only, no build step)
```

## Framework & Toolchain Quirks

- **Svelte 5 runes**: use `$state()`, `$derived`, `$props()`, `$effect()` — NOT Svelte 4 `$:` or `export let`
- **Tailwind CSS v4**: CSS-first config via `@theme` directive in `packages/design-system/src/tokens.css`. No `tailwind.config.js`.
- **Design tokens** live in `@mycosurge/design-system`. Import via `@import "@mycosurge/design-system"` in `app.css`. Use `var(--primary)`, `var(--surface)` etc. in component styles; Tailwind utilities `bg-primary`, `text-alert`, `border-border` also work.
- **SPA mode**: `+layout.ts` sets `ssr=false`, `prerender=true`, `trailingSlash='always'`. No server-side rendering.
- **Build order**: `config → game-engine → design-system → web` (Turbo handles via `dependsOn`).
- **Game state** auto-saves to `localStorage` key `mycosurge_save` every tick.
- **Pixi.js radar**: hardcoded 500×500 canvas. Keyboard (WASD/arrows) and touch input. 7 attack patterns per host config.
- **ESM only**: all packages are `"type": "module"`.
- **Stitch MCP** configured in `opencode.json` (Google Stitch UI generation service). Used for screen design → HTML export.

## Style & Convention

- **Brutalist terminal**: 0 border-radius, no shadows/gradients/transitions, JetBrains Mono font, ASCII progress bars (`█`/`░`), uppercase labels.
- **Buttons**: must use `cmd-btn` class (defined in design-system) and prefix: `> EXE:`, `SYS:`, or `SUDO:`.
- **Panel headers**: `text-label-caps` class, uppercase.
- **Formatted with Prettier**: `semi: true`, `singleQuote: true`, `tabWidth: 2`, `printWidth: 100`.
- **Responsive breakpoint**: 768px. Mobile = single-column stack, desktop = 3-column (sidebar | center | chat).

## Testing

- Vitest with glob patterns: `src/**/*.{test,spec}.{js,ts}`
- Game engine and web each have their own vitest config (no shared config).
