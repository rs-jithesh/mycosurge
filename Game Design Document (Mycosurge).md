# **Game Design Document: Mycosurge (Bullet Hell Variant)**

## **1\. Game Overview**

**Title:** Mycosurge

**Genre:** Idle / Bullet Hell / RPG Hybrid

**Platform:** Web-based (Angular/Frontend technologies)

**Theme:** Sci-Fi Biology / Fungal Assimilation

**Visual Style:** CRT Terminal / Retro-Hacker Interface. The bullet hell segments are represented as a tactical "Micro-Radar," using high-contrast minimalist shapes or ASCII-style characters glowing with green phosphor.

**Logline:** Play as a sentient, highly adaptable fungal strain in a restricted biological experiment. Expand your mycelial network by engaging in intense bullet-hell micro-battles against host immune systems, manage passive resource generation, and evolve through deep RPG skill trees to become an unstoppable biological force.

## **2\. Core Gameplay Loop**

1. **Engage (Active):** Dive into a host's cellular defense network, dodging waves of antibodies and firing spores in frantic bullet hell encounters to rapidly harvest Biomass.
2. **Expand (Idle):** Let passive systems harvest resources, manage expeditions, and train skills while avoiding resource Depletion.
3. **Evolve (RPG):** Spend gathered Biomass on Neural Mutations (Skill Trees) and inherit Evolutionary Echoes from conquered hosts.

## **3\. Active Gameplay: Micro-Radar Bullet Hell**

Replacing the standard "clicker" mechanic, combat and rapid assimilation are handled via top-down, bullet hell sequences embedded directly within the terminal UI.

- **Mechanic:** When engaging a host, a "Micro-Radar" window opens in the terminal. The player controls a central Mycelial Core (the player character).
- **Player Action:** Maneuver the core to dodge dense, overlapping patterns of incoming projectiles (representing white blood cells, enzymes, and toxic chemicals) while automatically or manually firing spore-projectiles back at the host's defense nodes.
- **Context:** The bullet hell phases represent the violent, microscopic clash between your invasive fungus and the host's active immune response.
- **Success/Failure:** Destroying the host nodes grants massive bursts of active Biomass and advances the assimilation percentage. Taking too many hits forces a retreat, resulting in a temporary "Trauma" cooldown before you can attack again.

## **4\. Idle Gameplay & Resource Management**

When the player is not actively dodging antibodies, the game transitions to a strategic idle management system.

- **Biomass Generation:** The primary currency, generated passively over time based on the player's current spread.
- **Depletion Mechanic:** A balancing system that prevents infinite idle farming. Overharvesting a host or area causes the resource yield to drop and raises the host's "Alert Level," making subsequent bullet hell encounters much harder.
- **Expeditions:** Sending out spores/mycelium runners to scout new hosts (takes real-world time to complete).
- **Passive Training:** Allocating small amounts of generated Biomass to slowly tick up base stats (e.g., toxin resistance, base movement speed) while away.

## **5\. Progression & RPG Elements**

The progression system uses the narrative flavor of biological evolution to upgrade the player.

- **Evolutionary Echoes:** Permanent, passive traits inherited from fully consumed hosts.
  - _Example:_ Conquering a "Fallen Leaf" grants a base \+5% to passive Biomass generation. Conquering a "Toxic Beetle" adds a slight poison damage-over-time effect to your spore projectiles.
- **Neural Mutations (Skill Trees):** Distinct paths allowing for diverse playstyles to balance the difficulty of the bullet hell segments:
  1. **Aggression (Combat Focus):** Increases spore projectile fire rate, adds multi-shot/spread patterns, and unlocks piercing projectiles that clear enemy bullets.
  2. **Resilience (Survival Focus):** Shrinks the player's hitbox (making dodging easier), adds ablative spore-shields to absorb extra hits, and reduces the "Trauma" cooldown on failure.
  3. **Proliferation (Idle Focus):** Increases passive Biomass caps, speeds up expedition timers, and boosts offline progression rates.

## **6\. Narrative & Atmosphere**

- **Dynamic Text Logs:** The narrative unfolds via systemic terminal text logs. (e.g., "WARNING: Host immune response escalating. Antibody density at 85%. Evasion recommended.")
- **Tone:** Clinical, slightly sinister, and deeply atmospheric. The player should feel like an alien intelligence breaking out of containment.

## **7\. Replayability & Longevity**

To ensure the game remains engaging across multiple playthroughs (or "Resets/Spawns"):

- **Varied Starting Locations:** Different environments spawn different enemies with entirely unique bullet hell attack patterns (e.g., erratic swarms vs. structured geometric lasers).
- **Build Diversity:** Limiting total Neural Mutation points forces players to commit. Will you build a glass cannon with massive spread shots, or a tiny, highly shielded core that relies on idle damage?
- **Random Events:** Sudden environmental shifts (e.g., "Chemical Pesticide Deployed") that trigger surprise mini-boss bullet hell survival phases.
