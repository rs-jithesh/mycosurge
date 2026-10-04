# Expansion & Discovery Map — Plan

Status: **Slices 1 & 2 shipped.** Supersedes the earlier growable-node-graph draft in this file.

## Concept

Expansion becomes a spatial frontier, not a number. Biomass grows the network into the
substrate; the map shows the colony at the centre, its hyphae reaching outward, the
territory it has claimed, and what it senses beyond the edge.

Three verbs, cleanly separated:

- **Expand (map)** — _what exists_. Spend Biomass to grow reach (mm). Deeper reach unlocks
  new host species and pulls from stronger pools.
- **Discover (first contact)** — the first time a species is in reach, a guaranteed encounter
  waits at the frontier. Driving it off **catalogues** it.
- **Farm (Radar/Hunt)** — once catalogued, a species can appear as recurring encounters
  (with strains) for repeatable Lysate/Biomass. _(Slice 2 — see below.)_

The **Bestiary** records what has been uncovered and teases what is still out there.

## Locked decisions

- Reach stays the economy scalar (`mycelialNetwork`, mm, rising Biomass cost). No rework.
- Map is a code-drawn **SVG** hyphae network, generated from a **persisted seed**; stable
  across sessions/reloads.
- **Catalogue = first defeat** of a species.
- **Bestiary** is its own overlay panel, opened from a **top-bar button beside the brand**;
  it appears only after the first species is catalogued.
- **First contact** is a guaranteed encounter at the frontier before farming.
- **Echoes are untouched now.** Full echo removal + rework is a **separate follow-up task**.
- Radar farm pool becomes **catalogue-gated** in Slice 2; Slice 1 leaves the radar as-is.

## Slice 1 (this task)

Foundations: seeded geometry, host placements, catalogue state, the map, and the bestiary.

**Config** (`packages/config/src/expansion-map.ts`): ring spacing/labels, sense range, ghost
length, branch count/step/jitter/fork rules, host-placement offsets, cord cost multiplier,
bestiary copy. No hardcoded tunables.

**Engine** (`packages/game-engine/src/network.ts`), pure and deterministic:

- `mulberry32(seed)` — tiny seeded PRNG (no dependency).
- `generateNetwork(seed)` → branch segments `{id, parentId, depth, x1, y1, x2, y2, endMm, width}`.
- `generateHostPlacements(seed)` → `{id, hostId, tier, isBoss, angle, distanceMm, x, y}` for
  every non-tutorial host; distance derived from `HOST_TIER_REACH[tier]` + a seeded offset.
- `getHostVisibility(placement, reachMm, senseRange, catalogued)` → `catalogued | encountered |
sensed | hidden`.
- `getFirstContact(state)` — nearest uncatalogued, in-reach host (the frontier encounter).
- `catalogueHost(state, hostId)` — record a first defeat.
- Cord stub: `getCordCost(state)` / `buildCord(state)` set `cordBranchId`.

**State** (`GameState`): `networkSeed: number`, `cordBranchId: string | null`,
`cataloguedHosts: string[]`. Merge + migrate in `loadState()`; seed assigned once on a new
game (old saves get a deterministic default).

**UI**:

- `MapOverlay.svelte` — SVG layers: territory wash → rings + mm labels → ghost growth →
  solid hyphae → cord (thicker/darker) → host markers. Reach animates by easing `drawnReach`
  toward the target with a small rAF loop in `$effect`. Tap an encountered host to hunt; a
  sensed host explains that you must extend reach.
- Expand panel — a "View network" button plus the existing push-reach control showing the
  next cost.
- `BestiaryPanel.svelte` — found entries (name, code-drawn silhouette, home ring, driven-off
  count) vs `???` with a directional hint. Opened from the top-bar button (beside the brand),
  which appears only once `cataloguedHosts.length > 0`.

**Animation / mobile**: rAF easing, `prefers-reduced-motion` respected. Pointer pan, pinch
zoom (transform the `<g>`, never regenerate geometry), ≥44 px host hit areas, a Fit control.

**Offline**: reach does not change offline in this slice; seed/geometry are save-stable.

## Slice 2 (shipped)

The radar farm pool is now **catalogue-gated**: `getFarmPool` returns only catalogued,
non-tutorial species, and `rollContact`/`tickRadar`/`pingSubstrate` draw from it. Expansion
and the map unlock _discovery_; the radar pulls repeatable, strained encounters from what you
have catalogued. The Hunt panel points players to the map when nothing is catalogued yet, and
existing saves are migrated so already-fought hosts stay in the pool.

Still open for later: surfacing live radar contacts on the map itself.

## Follow-up task (separate)

**Full echo removal + rework from scratch.** Touches: Evolution/Expeditions unlocks, combat
and passive bonuses, genome-point budget, the Evolution page listing, and saved data.

## Risks

- Seed/version stability — store a `mapVersion` so geometry params can change safely.
- Redraw cost — memoize geometry; transform for pan/zoom; animate only reach-dependent parts.
- Two discovery surfaces were merged in Slice 2: the map discovers, the radar farms.
- SVG labels/dashes scaling under zoom — counter-scale text.

## Open questions (later)

- Cord upkeep discount value (deferred; visual stub now).
- Behaviour beyond the 10 mm ring set (dynamic rings vs fixed for now).
