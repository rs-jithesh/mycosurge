# Mycosurge — 2D Asset Plan & Generation Workflow

How we plan, generate, and ship the game's raster art. The game currently ships **no image
assets** — every "icon" is a Unicode glyph (`≋ ✦ ◈ ⬡ ◎ ❖ ➤`) or a Pixi-drawn shape. That makes
icons the highest-value art work: a small, consistent set upgrades the whole UI at once.

Generated manually with **Google Gemini image models** ("Nano Banana") in Google AI Studio — no
local install, no API key. See the workflow below; ready-to-paste prompts for every icon live in
`PROMPTS.md`.

**Status:** Tier 0 (resources) and Tier 1 (systems & phases) are generated (256px PNG in
`apps/web/static/assets/icons/`) and wired into the UI. Next up: Tier 2 host portraits.

## Principles

1. **Coverage beats coolness.** Prioritise assets by how often they are seen, not how fun they
   are to make. The five economy icons appear everywhere; a boss portrait appears once.
2. **One style anchor.** Every asset must look like a sibling. Keep one prompt suffix and one
   model/settings block, and feed the approved first icon back in as a **reference image** so the
   rest inherit its badge, outline, and lighting.
3. **No transparency required.** Generate each icon on a **dark moss disc** background
   (`#161d1b`) — it reads as an on-brand "instrument badge", needs no cutout, and sits on every
   surface in the UI. (Gemini can do cutouts too, but keep that for the later combat-sprite pass.)
4. **Legibility at 32px is the acceptance test.** Generate at 1K, judge at 32px.
5. **Icon-first, illustration-later.** Flat sticker icons now; painterly hosts only once the
   economy icon set is approved and the style is locked.

## Palette anchors (from `packages/design-system/src/tokens.css`)

| Meaning        | Tone   | Hex       | Used by                          |
| -------------- | ------ | --------- | -------------------------------- |
| Water          | cyan   | `#68d6e3` | Osmotic Pump, gather phase       |
| Nutrients      | violet | `#b9a7ff` | Enzymatic Exudates, gather phase |
| Biomass        | mint   | `#70fdc3` | grow phase, primary actions      |
| Lysate         | amber  | `#f5c055` | expand phase, spend currency     |
| Echo / warning | coral  | `#ffb4ab` | hunt phase, alerts               |
| Backdrop disc  | moss   | `#161d1b` | every badge background           |

## Priority tiers

### Tier 0 — Resource & currency icons (6) — ✅ generated

Highest ROI: 6 icons make the entire economy legible across Core, generators, radar, evolution,
expeditions, and the tutorial.

| File            | Subject                        | Colour |
| --------------- | ------------------------------ | ------ |
| `water.png`     | droplet / osmotic bead         | cyan   |
| `nutrients.png` | spore cluster / root-node      | violet |
| `biomass.png`   | hyphal knot / mycelial clump   | mint   |
| `lysate.png`    | ruptured host cell / amber sap | amber  |
| `echo.png`      | imprint ring / DNA helix       | amber  |
| `core.png`      | fungal nucleus (brand mark)    | mint   |

### Tier 1 — Systems & phases (7) — ✅ generated

Replaces the Unicode glyphs in `apps/web/src/lib/content/phases.ts` and
`apps/web/src/lib/content/systems.ts`.

- Systems: `radar`, `evolution`, `expeditions`
- Phases: `gather` (cyan), `grow` (amber), `hunt` (coral), `expand` (mint)

### Tier 2 — Hosts (11, but start with 4)

Reused three ways: **radar contacts + combat tiles + echo cards**. Start with the early-game
hosts, then fill in.

- First: `soil_nematode`, `fallen_leaf`, `garden_beetle`, `field_mouse`
- Later: `urban_pigeon`, `stray_cat`, `lab_rat` (boss), `compost_worm`, `pond_frog`,
  `backyard_squirrel`, `feral_raccoon`

### Tier 3 — Depth iconography (8)

- Generators: `osmotic_pump`, `enzymatic_exudates`
- Upgrade categories: `mycelial`, `incursion`, `structural`
- Skill trees: `combat`, `survival`, `expansion`, `meta`

### Tier 4 — Combat & flourish

- `spore` projectile, `pellet`, strain badges (`normal`/`swift`/`armored`/`bloated`)
- Decorative `hyphae` divider/corner motif, `favicon`

## Sizing & naming

- **Generate** 512×512. **Export** 64px (inline UI), 128px (cards/portraits), 256px (hero/boss).
- Lowercase `snake_case` filenames matching the manifest key: `water.png`, `soil_nematode.png`.
- Drop into `apps/web/static/assets/icons/`. The `<ResourceIcon>` component and
  `apps/web/src/lib/content/icons.ts` manifest already handle the rest, falling back to the
  original glyph until each PNG exists.

---

## Generation workflow (Google AI Studio)

All generation is manual in the browser — no local install, no API key. Open
<https://aistudio.google.com>, pick an image model, and paste one prompt at a time from
`PROMPTS.md`.

> An earlier batch script was dropped: **no Gemini image model has a free API tier**, so the API
> path needs billing. Interactive use in AI Studio is free.

### Steps

1. Open <https://aistudio.google.com> and choose an image model — **Nano Banana 2**
   (`gemini-3.1-flash-image`) is the sweet spot; **Nano Banana Pro** (`gemini-3-pro-image`) is
   higher fidelity.
2. Set the aspect ratio to **1:1** and the image size to **1K** (icons export at 64/128).
3. Paste one prompt from `PROMPTS.md`, generate, and iterate.
4. Download the PNG and save it under its manifest filename (e.g. `water.png`).

### Baseline settings

| Setting      | Value                                         |
| ------------ | --------------------------------------------- |
| Model        | `gemini-3.1-flash-image` (Nano Banana 2)      |
| Aspect ratio | `1:1`                                         |
| Image size   | `1K` (bump to `2K` for more detail if wanted) |

### The prompt recipe

**Shared style suffix** (append to every subject — this is the style anchor):

```
game icon, flat vector sticker, thick clean outline, bio-luminescent <COLOUR> glow,
centered on a dark moss-green circular badge (#161d1b), simple bold silhouette,
high contrast, readable at small size, fungal biology
```

**Things to avoid** (Gemini has no separate negative-prompt field — the ready-made prompts in
`PROMPTS.md` already bake the important ones in, e.g. "no text", "simple bold silhouette"):

```
text, letters, numbers, watermark, signature, blurry, photorealistic, 3d render,
cluttered, multiple objects, busy background, gradient mesh
```

**Example — `water.png`:**

```
game icon, a single glossy water droplet, flat vector sticker, thick clean outline,
bio-luminescent cyan (#68d6e3) glow, centered on a dark moss-green circular badge
(#161d1b), simple bold silhouette, high contrast, readable at small size, fungal biology
```

Swap only the subject phrase per icon: `a knot of white hyphae` (biomass), `a cluster of violet
spores` (nutrients), `a radiant nucleus with hyphae` (core). Keep colour + suffix identical.

### Lock consistency

1. Generate `water.png` first; iterate until it's the look you want. This is your "master".
2. Keep the **same prompt suffix and settings** for every other icon — only the subject phrase
   changes (that is already true in `PROMPTS.md`).
3. If an icon drifts off-style, re-run it in AI Studio with the approved `water.png` attached as
   a **reference image**: "match the style of this icon, now a nutrients spore cluster." Gemini
   is strong at this, which is the main reason we chose it.
4. Keep `PROMPTS.md` updated if you tweak any wording, so the set stays reproducible.

### Background & export

- The **dark moss disc** is painted into the icon — nothing to cut out. No alpha, no matting, no
  halos.
- If you later need true cutouts (transparent combat sprites), that is a separate pass — generate
  on a flat high-contrast background and remove it (e.g. `rembg`, Preview "Instant Alpha", or ask
  Gemini for a transparent PNG).
- Save AI Studio exports to `apps/web/static/assets/icons/` with the manifest filename, and
  downscale to 64/128/256 as needed.

### Verification loop

The `<ResourceIcon>` component renders the PNG when present and silently falls back to the glyph
when it is missing. So you can generate **one icon at a time** — copy it in, refresh, and watch
the UI progressively upgrade. Check that each icon is readable at 32px before moving on.

## Integration

- Manifest: `apps/web/src/lib/content/icons.ts` (`IconKey`, `ICON_META`).
- Component: `apps/web/src/lib/components/ResourceIcon.svelte` — `<ResourceIcon name="water" size={18} />`.
- Files: `apps/web/static/assets/icons/<key>.png` (see `README.md` in that folder).
- Prompts: `PROMPTS.md` — copy-paste Gemini prompt for every key, tier by tier.
