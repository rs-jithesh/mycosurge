# Mycosurge — Game Design

## Overview

|               |                                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| **Title**     | Mycosurge                                                                              |
| **Genre**     | Idle / bullet-hell / RPG hybrid                                                        |
| **Platform**  | Web (SvelteKit 5 SPA + Pixi.js v8)                                                     |
| **Theme**     | Ecological biology — a sentient fungal network growing through a substrate             |
| **Aesthetic** | Bio-Luminal Lab (see `DESIGN.md`)                                                      |
| **Logline**   | Grow a mycelial network, automate it, evolve it, and fight the hosts that graze on it. |

The interface is a friendly, well-labelled instrument. The fiction — a cold, invasive
organism — lives in the flavour text and the arena, not in the controls. Every control a
player must use leads with a plain verb.

## Core Loop

**Manage resources → fight a host → spend Lysate to expand caps → manage a bigger network.**

Three verbs, each additive — later systems never replace earlier ones:

1. **Harvest & grow** — gather Water and Nutrients, synthesise Biomass.
2. **Automate** — install and upgrade generators; Water and Nutrients tick up passively.
3. **Fight & evolve** — engage hosts in the arena for Biomass and Lysate; spend Biomass on
   Mutations and Growth upgrades, and Lysate on larger resource caps.

## Resources

| Resource      | Behaviour                             | Role                                                                                                   |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Water**     | Passive drain; produced by generators | Gating resource. Below 35% cuts combat yield; below 15% is starvation.                                 |
| **Nutrients** | Passive drain; produced by generators | Digestion gate. Below 40% cuts combat yield; below 15% is starvation.                                  |
| **Biomass**   | Accumulates + combat rewards          | Currency for generators, Mutations, and Growth upgrades.                                               |
| **Lysate**    | Combat only; perishable               | `Raw` Lysate stabilises into `banked` Lysate using Water + Nutrients, or decays. Spent to expand caps. |

Each pool has a cap. Combat and expedition rewards that arrive above a cap are **kept** —
the network never silently deletes earned Biomass.

## Systems

### Generators

Passive producers, bought with Biomass and levelled up (each level raises cost by the
generator's `costScale`).

- **Osmotic Pump** — `+1 Water / sec` per level.
- **Enzymatic Exudates** — `+1 Nutrients / sec` per level.

The two tutorial generators become permanent at the end of onboarding.

Generators also carry **metabolic upkeep**, a gentle continuous drain on Water and Nutrients
that scales with network complexity: a small charge per generator level, per acquired echo,
and per capacity expansion. It is charged only in the full game (the tutorial runs its own
economy). Upkeep trims a fully grown network to a modest net surplus, so Synthesize stays a
real decision instead of a free conversion, without ever forcing a well-tended colony to
starve. The Core's Gather panel shows the net rate (`produced · upkeep · net`).

### Field actions (manual)

The Core keeps two manual actions so active play has a floor:

- **Absorb** — `+2 Water, +2 Nutrients` on a 5-second cooldown (clamped to caps). It
  cannot be spammed, so it helps early on without replacing the generator economy.
- **Synthesize Biomass** — convert `10 Water + 10 Nutrients` into Biomass. The yield
  depends on the reserves left behind: **1 Biomass** at healthy levels, **0.5** when
  strained (below 40% either resource), and **0** near starvation (below 5%). The
  resources are consumed either way, so overdrawing wastes them.

### Starvation

If either reserve falls below **5%**, the network is **starving**: passive Biomass
generation halts and a warning banner shows on the Core. Generators still refill
Water/Nutrients and **Absorb** still works, so it recovers on its own. Combat yield is
already zero well before this point (see the thresholds above). Growth resumes
automatically once both reserves climb back above 5%.

### Combat yield thresholds

The network must have enough Water and Nutrients to metabolically process a fight's
reward. Both gate independently:

| State                               | Yield           |
| ----------------------------------- | --------------- |
| Water ≥ 35% **and** Nutrients ≥ 40% | 100%            |
| One below threshold                 | 50%             |
| Both below threshold                | 15%             |
| Either below 15%                    | 0% (starvation) |

### Lysate & cap expansion

Combat drops **Raw Lysate**. Each tick, raw Lysate stabilises into banked Lysate by
spending Water and Nutrients; if the network can't pay, raw Lysate decays. Banked Lysate
buys `+10` to the Water, Nutrients, or Biomass cap, at a rising cost per expansion.

### Mutations (skill tree)

Spent with Biomass on the Evolution page. Each node has levels and prerequisites; a
prerequisite must be **fully levelled** before the next node unlocks. Three trees:

- **Aggression** — Spore Speed, Fire Rate, Multi-Shot, Piercing Shot, Overcharge, Chain
  Reaction.
- **Resilience** — Compact Core, Spore Shield, Trauma Recovery, Regenerative Spores,
  Adaptive Membrane, Emergency Evac.
- **Proliferation** — Mycelial Expansion, Metabolic Efficiency, Rapid Scouts, Resource
  Routing, Dormant Spores, Overmind.

### Growth upgrades

Three categories on the Evolution page, each an upgrade line with prerequisites:

- **Network** — Water and Nutrient economy (Hygroscopic Mesh, Vacuolar Expansion, Osmotic
  Regulation, Aquaporin Channels, Exoenzyme Cascade, Chitin Recycling, Rhizomorphic
  Networking, Nitrogen Fixation Symbiosis).
- **Combat** — Spore Veil, Enzymatic Breach, Hyphal Invasion, Neural Override.
- **Structure** — Biomass cap and resilience (Hyphal Density Protocol, Melanin Shielding,
  Sporulation Burst, Anastomosis Bridges).

### Expeditions

Send a host off to forage; it returns after real time for bonus Biomass. One slot by
default, two with the **Overmind** mutation. Rewards and duration scale with the Rapid
Scouts and Resource Routing mutations.

### Evolutionary echoes

Defeating a host for the first time grants its permanent **echo** — a passive trait (e.g.
passive generation, poison damage, fire rate, dodge window). Echoes are listed on the
Evolution page and their effects apply everywhere: passive Biomass, spore fire rate and
damage, poison over time, HP regen, arena movement speed, the post-hit dodge window,
projectile evasion, and mutation costs.

## Hosts & discovery

Eleven hosts, each with an echo and one to three attack patterns (see `COMBAT.md`). A host
joins the sonar pool only once you have collected enough **echoes** (`acquiredEchoes`):

| Tier     | Echoes required | Hosts                                 |
| -------- | --------------- | ------------------------------------- |
| 1        | 0               | Fallen Leaf, Compost Worm             |
| 2        | 2               | Garden Beetle, Pond Frog, Field Mouse |
| 3        | 4               | Urban Pigeon, Backyard Squirrel       |
| 4        | 6               | Stray Cat, Feral Raccoon              |
| Boss (5) | 9               | Laboratory Rat                        |

`Soil Nematode` is the tutorial encounter and never appears in the pool.

| Host                  | Tier | Difficulty | Patterns                                         |
| --------------------- | ---- | ---------- | ------------------------------------------------ |
| Soil Nematode         | —    | 1          | slow_spiral                                      |
| Fallen Leaf           | 1    | 1          | slow_spiral                                      |
| Compost Worm          | 1    | 1          | slow_spiral, wave                                |
| Garden Beetle         | 2    | 2          | burst, scatter                                   |
| Field Mouse           | 2    | 3          | erratic_swarm, wave                              |
| Pond Frog             | 2    | 3          | burst, homing, scatter                           |
| Urban Pigeon          | 3    | 4          | homing, spiral_nova                              |
| Backyard Squirrel     | 3    | 4          | erratic_swarm, scatter, wave                     |
| Stray Cat             | 4    | 5          | pattern_combo, enrage_phase                      |
| Feral Raccoon         | 4    | 6          | pattern_combo, homing, spiral_nova, enrage_phase |
| Laboratory Rat (Boss) | 5    | 7          | multi_phase, geometric_lasers, summon            |

### Radar (sonar)

The Radar is a scanning instrument, not a host menu. **Blips** drift in over time (roughly
every 20s) while you are idle, up to your contact-slot limit (2, or 3 with the **Extended
Range** growth upgrade). Spend 5 Water to **scan** a blip and reveal the host, or **ping
the substrate** (5 Water) to force a new blip onto a free slot. Revealed contacts show
level, strain, reward, and how far that host is from yielding its echo. Contacts drift
away after two minutes if left alone.

### Strains

Any contact can carry a **strain**, a light per-encounter modifier:

| Strain  | Odds | Effect                               |
| ------- | ---- | ------------------------------------ |
| Normal  | 72%  | —                                    |
| Swift   | 10%  | +30% projectile speed, +25% reward   |
| Armored | 10%  | +50% HP, +30% reward                 |
| Bloated | 8%   | −15% speed, +60% reward, +50% Lysate |

### Assimilation

Each victory assimilates **that host** by `10 + difficulty × 5`. At 100 the host is fully
grown over: its echo joins your network, `hostsDefeated` rises once, and it no longer
grants echoes. Full assimilation is also what unlocks the next host tier.

Separately, every victory adds a small, fixed amount of **ecological strain** (`2` per win)
to a global meter, independent of the per-host echo progress. Strain — together with the
combat **alert level** — slowly reduces raw passive Biomass efficiency. The Core's Grow panel
shows the strain percentage and its current drag (`passive −N%`); the Evolution page lists the
aggregated echo bonuses, so the trade is legible: **more complexity means lower raw
efficiency but greater capability**, and the echoes repay the drag many times over.

## Onboarding

The first session is a four-step tutorial plus a threat handoff, gated by `gamePhase`
(`awakening → manager → explorer → tactician → active`):

1. **Feed** — Absorb Water and Nutrients.
2. **Grow** — Synthesise Biomass from 10 Water + 10 Nutrients.
3. **Automate** — install a generator (2 Biomass).
4. **Expand** — extend hyphae to 5 mm.
5. **Threat** — something is grazing on the outer hyphae; scan it on the Radar and fight
   the tutorial nematode. Victory completes the tutorial and unlocks the full game.

Locked actions are shown dimmed with a reason, then flash when they unlock. Finishing the
tutorial unlocks the **core chain** — Core and Radar — alongside a one-time "systems
unlocked" overlay.

The remaining systems are **unfolded as the player reaches them** rather than dumped at once:
**Evolution** appears once enough Biomass has been earned to spend on mutations, and
**Expeditions** appear once the first host has been grown over (its echo acquired). Locked
tabs are hidden, each new system announces itself once in the activity log, and its tab
carries a "New" badge until first visited. Unlocks are based on lifetime totals, so a system
never re-locks once reached.

## Tone & voice

- **Plain verbs first, flavour second.** Buttons and instructions are literal; the
  activity log carries the atmosphere.
- **No terminal jargon** in player-facing copy — no `SYS:`/`EXE:` prefixes, no
  "neutralize"/"assimilate"; say "drive off", "grow over", "recover".
- **Consistent terms**: Water, Nutrients, Biomass, Lysate, Core, Radar, Evolution,
  Expeditions, Generators, Mutations, Echoes, Hosts.

## Persistence & QA

- Game state auto-saves to `localStorage` under `mycosurge_save`; the post-tutorial
  overlay flag is `mycosurge_unlock_seen`.
- `?skipintro` completes the tutorial immediately (QA only).
- The top-bar **Reset** clears progress and replays the tutorial.

### Offline progression

The colony keeps growing while the tab is closed. On return, the elapsed time (capped at
**8 hours**) is simulated at a base **50%** rate, raised by **25%** per level of the Dormant
Spores mutation (up to the full online rate). Expeditions and trauma recovery run in real
time; contacts that would have drifted away expire. A "Welcome back" banner summarises what
the network produced.

## Longevity

- **Build diversity** — limited Biomass and distinct mutation trees force trade-offs
  between a glass-cannon spread build and a tiny shielded core.
- **Varied hosts** — each host mixes attack patterns, so later encounters feel different
  from the worm.
- **Rising caps** — Lysate cap expansion and Biomass rewards keep the numbers climbing
  without a hard reset.
