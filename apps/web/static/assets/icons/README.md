# Game icons

PNG raster icons for the UI. **Optional** — every icon has a Unicode glyph fallback, so the game
works before any file lands here and progressively upgrades as PNGs are added.

## How it works

- Registry: `apps/web/src/lib/content/icons.ts` (`ICON_META` maps key → `{ file, glyph, ... }`).
- Component: `apps/web/src/lib/components/ResourceIcon.svelte`.
- This folder is served at `/assets/icons/<file>` (prefixed by `paths.base` in the app).

## Adding an icon

1. Generate it per `ASSET-PLAN.md` (DiffusionBee workflow).
2. Name the file exactly as the manifest's `file` field (lowercase `snake_case`, `.png`).
3. Export at 64px (inline UI), 128px (cards), or 256px (hero/boss) and drop it here.
4. Refresh — `<ResourceIcon name="..." />` now shows the PNG instead of the glyph.

Icons are generated on a dark moss disc (`#161d1b`), so no transparency is required.
