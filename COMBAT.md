# Mycosurge — Combat (Bullet-Hell Arena)

Combat runs in a Pixi.js v8 canvas inside `CombatModal.svelte`, driven by
`apps/web/src/lib/pixi/radar.ts`. It is a twin-stick-style dodger: **the player only
moves; spores fire automatically.**

## Flow

1. **Hunt** (the Hunt phase of the Growth Cycle, or the tutorial handoff) lists scannable
   hosts. During the tutorial, a three-step scan flow (scan → identify → engage) introduces the
   first nematode.
2. **Engage** opens the combat overlay on top of the Core view: the arena plus HUD.
3. **Resolve** — clearing every host node is a victory (rewards); running out of HP or
   retreating is a defeat (trauma). The overlay then shows the result.

## Arena

A fixed 500×500 logical canvas, scaled to fit its container (`aspect-ratio: 1`).

- **Backdrop** — near-black `#0a100e` with a mint grid (6% alpha every 28px) and a soft
  radial glow. Rectangular tile hosts are drawn as coral rounded squares; the player is a
  mint circle with an outer glow. Projectiles are **shapes**, not ASCII: mint pills for
  spores (rotated along travel), coral dots for incoming pellets.
- **Reduced motion** — the app honours `prefers-reduced-motion`; the canvas keeps its
  focus ring and an `aria-label`.

## Controls

- **Keyboard** — WASD or arrow keys move the core.
- **Touch** — drag anywhere in the arena to move (the drag vector sets direction).
- Spores auto-fire toward the player's facing direction.

## HUD

- **Objective banner** above the arena names the target: "Drive off {host}".
- **HOST HP bar** overlays the top of the arena (aggregate of all living nodes).
- **YOU HP bar** sits below the arena with `current / max`, plus a shield counter.
- **Control hint** pill sits at the bottom of the arena.
- A coral `● HOSTILE` chip sits in the modal header during the fight.

## Entities

| Entity      | Visual                            | Behaviour                                                                  |
| ----------- | --------------------------------- | -------------------------------------------------------------------------- |
| Player core | Mint circle + glow                | Moves on input; flashes coral when hit; blinks while invulnerable.         |
| Host node   | Coral rounded square + name glyph | Has HP; steers around the arena; fires pattern projectiles; flashes white. |
| Spore       | Mint pill                         | Auto-fired; damages host nodes; can pierce.                                |
| Pellet      | Coral dot                         | Host projectile; damages the player.                                       |

Node count and HP scale with host difficulty (`DIFFICULTY_NODE_COUNT`, per-difficulty HP
multiplier). The arena is a win only when **all** nodes are destroyed.

## Host movement & targeting

Node behaviour is driven by a small, pure AI in `packages/game-engine/src/combat-ai.ts`
(no rendering): a finite state machine plus weighted steering behaviours and lead-aim.

- **Intent FSM** — `idle → reposition → engage`. Static hosts never leave `idle`; mobile
  hosts dwell, reposition (pick a new strafe direction/range), then engage, looping.
- **Steering** — a weighted sum of arrival (hold a preferred range), orbit/strafe,
  wander (idle drift), separation (don't stack), and containment (stay in-bounds),
  truncated to the host's move speed and smoothed by its turn rate.
- **Lead-aim** — aimed patterns fire at the player's predicted position (exact intercept
  solve), not their current one. Patterns only fire while the host is engaged and in
  range (`shouldFire`), so they don't spew mid-reposition.
- **Dodging** — difficulty 3+ hosts scan incoming spores for their closest point of
  approach and, when a shot will pass within their danger radius, sidestep perpendicular
  to it. A `dodgeTimer` commits each sidestep and a `dodgeCooldown` paces them, so evasions
  read as deliberate rather than twitchy. Dodge strength scales with `dodgeSkill`.
- **Profiles** — `resolveAiProfile(difficulty)` derives mobility, preferred range, move
  speed, turn rate, aggression, and dodge skill; a host may override any of them via the
  optional `ai` block on `HostDef`. Difficulty 1 hosts are static, difficulty 2 drift,
  difficulty 3+ orbit and dodge.

The movement speed of orbiting hosts also scales with the encounter strain's
`speedMult` (Swift hosts move faster, Bloated slower), passed through the arena
`moveSpeedMult` modifier.

## Attack patterns

Twelve patterns, per host config. Each node runs one (cycling through the host's list):

| Pattern            | Behaviour                                               |
| ------------------ | ------------------------------------------------------- |
| `slow_spiral`      | Steady rotating single shot.                            |
| `burst`            | Aimed fan of 5.                                         |
| `scatter`          | 6 random directions.                                    |
| `wave`             | Aimed shot with a perpendicular offset.                 |
| `homing`           | Aimed straight at the player.                           |
| `erratic_swarm`    | 3 fast random shots.                                    |
| `spiral_nova`      | Rotating twin ring.                                     |
| `pattern_combo`    | Alternates an aimed fan and a random spread.            |
| `enrage_phase`     | Twin rotating shots that speed up as the node loses HP. |
| `multi_phase`      | Cycles random spread → aimed → rotating ring.           |
| `geometric_lasers` | Fast shots along four rotating spokes.                  |
| `summon`           | Slow 8-way ring on a long interval.                     |

## Skills that affect combat

Mutations on the Evolution page feed directly into the arena via `combatStats`:

- **Offense** — Spore Speed, Fire Rate, Multi-Shot, Piercing Shot, Overcharge, Chain
  Reaction (splash damage on hit).
- **Defense** — Compact Core (smaller hitbox), Spore Shield (absorb hits), Adaptive
  Membrane (damage resistance), Regenerative Spores (HP regen), Emergency Evac (survive
  at 1 HP), Trauma Recovery (shorter trauma).

Combat yield is additionally gated by Water/Nutrients (see `GAME-DESIGN.md`).

## Strains

Contacts from the Radar may carry a **strain** (see `GAME-DESIGN.md`). When a contact is
engaged, its strain is stored on the state (`activeStrainId`) and read by:

- `createRadar(…, modifiers)` — `hpMult` scales node HP, `speedMult` scales every host
  projectile, and `moveSpeedMult` scales mobile host movement. The in-arena objective
  banner shows the strain name.
- `applyVictory` — `rewardMult` scales Biomass, `lysateMult` scales Lysate.

The active strain resets to `normal` when the encounter ends (victory, defeat, or
retreat).

## Assimilation

Assimilation is tracked **per host** in `hostAssimilation`. Each victory adds
`10 + difficulty × 5` to that host; reaching 100 unlocks its echo and raises
`hostsDefeated` once. A separate global `assimilationPercent` still accumulates as
ecological strain and is what `getDepletionMultiplier` reads.

## Defeat & trauma

On defeat the network enters **trauma**: a recovery timer during which production is
suppressed and hosts cannot be engaged. The timer scales down with Trauma Recovery.
Entering trauma resets shields and refills HP. The tutorial encounter uses a distinct
three-part penalty instead (hyphae pushed back, a little Biomass burned, production
halved briefly).

## Implementation notes

- `createRadar(container, hostId, combatStats, callbacks, modifiers)` builds the app and
  returns `{ destroy }`. Callers **must** call `destroy()` when closing the overlay.
- Callbacks: `onVictory()` (the arena reports the win; the **store** computes the real
  reward), `onDefeat()`, and `onStats({ hp, maxHp, shieldHits, hostHp, hostMaxHp })` for
  the HUD.
- Keyboard listeners are attached to `window` and removed on `destroy`; touch listeners
  are attached to the canvas. On small screens the drag delta is scaled by the canvas
  fit ratio.
- Reward plumbing lives in `gameStore.resolveCombat()`, which returns the `CombatResult`
  the modal displays.
