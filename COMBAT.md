# Mycosurge — Combat (Bullet-Hell Arena)

Combat runs in a Pixi.js v8 canvas inside `CombatModal.svelte`, driven by
`apps/web/src/lib/pixi/radar.ts`. The default combat is a **charge slam**: the player steers
and lunges into host nodes. (A ranged spore shooter still exists in the code but is disabled
for now — it is intended to return as an unlockable upgrade.)

## Flow

1. **Hunt** (the Hunt phase of the Growth Cycle, or the tutorial handoff) lists scannable
   hosts. During the tutorial, a three-step scan flow (scan → identify → engage) introduces the
   first nematode.
2. **Engage** opens the combat overlay on top of the Core view: the arena plus HUD.
3. **Resolve** — clearing every host node is a victory (rewards); running out of HP or
   retreating is a defeat (trauma). On victory the last host **shatters and dissolves** for
   `HOST_DECAY_TIME` (1s) — with in-flight shots swept away — before the result overlay
   appears, so the win has a moment to land.

## Arena

A fixed 500×500 logical canvas, scaled to fit its container (`aspect-ratio: 1`).

- **Backdrop** — near-black `#0a100e` with a mint grid (6% alpha every 28px) and a soft
  radial glow. Rectangular tile hosts are drawn as coral rounded squares; the player is a
  mint circle with an outer glow. Projectiles are **shapes**, not ASCII: coral dots for host
  pellets.
- **Reduced motion** — the app honours `prefers-reduced-motion`; the canvas keeps its
  focus ring and an `aria-label`.

## Controls

- **Keyboard** — WASD or arrow keys move the core; **hold Space** to charge, release to slam.
- **Touch** — drag anywhere in the arena to move; hold the on-screen **Charge** button to
  charge, release to slam.

## Charge slam

Every fight is melee: the player attacks by charging and slamming into host nodes.

- **Charge** — hold the charge input (**Space** on keyboard, or the on-screen **Charge** button
  on touch) to fill a meter (fills in `CHARGE_FULL_TIME`, 0.8s). Release to lunge in the
  direction the core faces.
- **Slam** — a connecting lunge deals `MELEE_BASE_DAMAGE + MELEE_CHARGE_DAMAGE × charge`
  (2–6), throws the core back off the node (`MELEE_KNOCKBACK_SPEED` / `MELEE_KNOCKBACK_TIME`),
  and grants a short invulnerability window (`MELEE_INVULN`, 0.7s). A release below
  `CHARGE_MIN_TO_DASH` (15%) is a cancel, and after a lunge ends there's a `CHARGE_COOLDOWN`
  (0.45s) pause before the next charge.
- Nodes still fire their attack patterns, so the loop is dodge → charge → slam.

Tuning lives in `apps/web/src/lib/pixi/constants.ts` (`CHARGE_*`, `DASH_*`, `MELEE_*`). Melee
is the default; passing `{ melee: false }` to `createRadar` restores the dormant spore shooter.

## HUD

- **Objective banner** above the arena names the target: "Drive off {host}".
- **HOST HP bar** overlays the top of the arena (aggregate of all living nodes).
- **YOU HP bar** sits below the arena with `current / max`, plus a shield counter.
- **Control hint** pill sits at the bottom of the arena.
- A coral `● HOSTILE` chip sits in the modal header during the fight.

## Entities

| Entity      | Visual                            | Behaviour                                                                                                           |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Player core | Mint circle + glow                | Moves on input; flashes coral when hit; blinks while invulnerable. A rim chevron marks the facing/charge direction. |
| Host node   | Coral rounded square + name glyph | Has HP; steers around the arena; fires pattern projectiles; flashes white. Shatters into shards when destroyed.     |
| Pellet      | Coral dot                         | Host projectile; damages the player.                                                                                |
| Spore       | Mint pill                         | Dormant — the ranged shooter it belongs to is disabled for now (planned as an unlockable upgrade).                  |

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
- **Dodging** — difficulty 3+ hosts scan incoming projectiles for their closest point of
  approach and, when a shot will pass within their danger radius, sidestep perpendicular
  to it. A `dodgeTimer` commits each sidestep and a `dodgeCooldown` paces them, so evasions
  read as deliberate rather than twitchy. Dodge strength scales with `dodgeSkill`. (Inert while
  melee is the default combat — there are no friendly projectiles to dodge.)
- **Profiles** — `resolveAiProfile(difficulty)` derives mobility, preferred range, move
  speed, turn rate, aggression, and dodge skill; a host may override any of them via the
  optional `ai` block on `HostDef`. Difficulty 1 hosts are static, difficulty 2 drift,
  difficulty 3+ orbit and dodge.

The movement speed of orbiting hosts also scales with the encounter variant's
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

## Variants

Contacts from the Radar may carry a **variant** (see `GAME-DESIGN.md`). When a contact is
engaged, its variant is stored on the state (`activeVariantId`) and read by:

- `createRadar(…, modifiers)` — `hpMult` scales node HP, `speedMult` scales every host
  projectile, and `moveSpeedMult` scales mobile host movement. The in-arena objective
  banner shows the variant name.
- `applyVictory` — `rewardMult` scales Biomass, `lysateMult` scales Lysate.

The active variant resets to `normal` when the encounter ends (victory, defeat, or
retreat).

Combat yield is gated by Water/Nutrients (see `GAME-DESIGN.md`).

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
  reward), `onDefeat()`, and `onStats({ hp, maxHp, shieldHits, hostHp, hostMaxHp, charge,
charging })` for the HUD.
- Keyboard listeners are attached to `window` and removed on `destroy`; touch listeners
  are attached to the canvas. On small screens the drag delta is scaled by the canvas
  fit ratio.
- Reward plumbing lives in `gameStore.resolveCombat()`, which returns the `CombatResult`
  the modal displays.
