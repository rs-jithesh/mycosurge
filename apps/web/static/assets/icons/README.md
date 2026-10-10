# Game icons

The UI currently renders **Unicode glyphs only** — resources use Greek symbols (`ψ ν β λ μ`) and
everything else a small pictograph. Raster icon artwork is **deferred** (see `ASSET-PLAN.md`);
no PNGs ship right now.

## How it works

- Registry: `apps/web/src/lib/content/icons.ts` (`ICON_META` maps a key → `{ glyph, label, tone }`).
  Resource glyphs/labels/tones come from `@mycosurge/config` `RESOURCES`, not this registry.
- Component: `apps/web/src/lib/components/ResourceIcon.svelte` — `<ResourceIcon name="water" size={18} />`.
  Accepts a registry key or a resource id and renders the resolved glyph (with a resource tooltip).

## Re-introducing raster art (later)

1. Restore the `file` field on `IconMeta` and add each key's PNG filename in `ICON_META`.
2. Restore the `<img>` → glyph fallback branch in `ResourceIcon.svelte`.
3. Generate the PNGs (see `ASSET-PLAN.md` / `PROMPTS.md`) and drop them here, named exactly as the
   manifest's `file` (lowercase `snake_case`, `.png`). Export at 64px (inline), 128px (cards), or
   256px (hero/boss).
4. This folder is served at `/assets/icons/<file>` (prefixed by `paths.base` in the app).
