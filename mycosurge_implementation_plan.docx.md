**MYCOSURGE :: IMPLEMENTATION PLAN**

Design & Systems Document — v2.0

# **01 :: PROJECT OVERVIEW**

MycoSurge is a browser-based incremental/idle game with bullet hell combat elements, built in Svelte with TypeScript. The player manages a fungal network that grows, spreads, and attacks hosts. Resource management feeds into combat, which feeds back into expanded resource capacity — a tightly coupled flywheel loop.

|               |                                                    |
| :------------ | :------------------------------------------------- |
|               |                                                    |
| **Core Loop** | Resource management → Combat → Cap expansion       |
| **Aesthetic** | Terminal UI, ecological horror, biological theming |

# **02 :: CORE GAME LOOP**

The game progresses through three phases, each introducing a new verb while preserving previous systems:

- Phase 1 — Clicking: Player manually harvests resources by clicking. Water and Nutrients deplete passively; Biomass accumulates.

- Phase 2 — Generators: Automated resource generation unlocked via upgrades. Player shifts from active clicking to management and investment decisions.

- Phase 3 — Combat: Bullet hell incursion system unlocked. Combat yields a new resource. This resource is used to expand resource caps, deepening the management layer.

Each phase is additive — generators do not replace clicking, and combat does not replace generators. The player manages all active systems simultaneously in late game.

# **03 :: RESOURCE SYSTEM**

## **3.1 :: PRIMARY RESOURCES**

Three primary resources govern the management layer. All are visible on the Core page with progress bar indicators showing fill state at a glance.

| Resource          | Behaviour         | Role                                                                                                                                                            |
| :---------------- | :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WATER (W)**     | Passive depletion | Primary gating resource. Below 35% reduces combat yield processing. Below 15% triggers full starvation.                                                         |
| **NUTRIENTS (N)** | Passive depletion | Biological processing gate. Below 40% reduces combat yield. Higher threshold than Water — nutrient availability is the primary bottleneck for fungal digestion. |
| **BIOMASS**       | Accumulates       | Structural growth metric. Used for upgrades and generator costs. Subject to loss from hostile events.                                                           |

## **3.2 :: COMBAT RESOURCE**

Combat encounters yield a new resource — working name: LYSATE. This represents cellular breakdown product extracted from destroyed host tissue, biologically grounded in fungal decomposition mechanics.

Lysate is not passively generated. It is only produced through combat. Its key design property is that it is perishable — Lysate decays over time unless the player spends Water and Nutrients to stabilize and bank it. This directly couples the combat system to the resource management layer.

Primary use of Lysate: expanding resource caps for Water, Nutrients, and Biomass. This closes the flywheel — combat success enables a larger, more capable network.

# **04 :: COMBAT YIELD PROCESSING THRESHOLDS**

Combat yield is not processed automatically. The network must have sufficient Water and Nutrients to metabolically process the Lysate extracted from combat. Both resources gate processing independently — failing either threshold reduces yield.

| Resource State                       | Combat Yield Processed | Notes                                    |
| :----------------------------------- | :--------------------- | :--------------------------------------- |
| Both Water ≥ 35% AND Nutrients ≥ 40% | **100%**               | Full processing — optimal state          |
| One resource below threshold         | **45–55%**             | Partial yield — active management needed |
| Both resources below threshold       | **15–20%**             | Minimal yield — near-failure state       |
| Either resource below 15%            | **0%**                 | Full starvation — zero processing        |

The asymmetry between Water (35%) and Nutrients (40%) is intentional. Nutrient availability is the primary biological bottleneck for fungal digestion; Water is an enabling condition. These thresholds should be tuned based on generator replenishment speed during playtesting:

- If replenishment is fast: raise both thresholds to 45% / 50%

- If replenishment is slow: lower Water threshold to 25%

- The relative gap between them matters more than absolute values

DESIGN NOTE: The 15% starvation floor maps directly to the Water critical state shown in the current UI mockup (12%). This is a good demonstration of stakes — a player at 12% Water is already in zero-yield territory.

# **05 :: UPGRADES SYSTEM**

## **5.1 :: PAGE STRUCTURE**

All upgrades live on a single dedicated Upgrades page, organised into three categorical sections. The Core page retains quick-purchase shortcuts for the most common resource upgrades as a convenience hotbar — not the full tree.

- MYCELIAL NETWORK — resource and growth upgrades

- INCURSION PROTOCOLS — combat upgrades (to be designed in next phase)

- STRUCTURAL — cap expansions and passive bonuses

## **5.2 :: WATER UPGRADES — HYDRIC SYSTEMS**

- **UPG: HYGROSCOPIC_MESH** — Hyphae develop water-attracting surface proteins, passively pulling moisture from surrounding air. Effect: increases passive Water regeneration rate.

- **UPG: VACUOLAR_EXPANSION** — Enlarges the fungal vacuole system — the primary water storage organelle in fungi. Effect: increases Water cap.

- **UPG: OSMOTIC_REGULATION_V2** — Improves the network's ability to maintain water balance under metabolic stress. Effect: reduces Water drain rate during combat encounters.

- **UPG: AQUAPORIN_CHANNELS** — Biological water transport proteins. Increases speed of water movement through hyphal networks. Effect: increases Water transfer speed between generators.

## **5.3 :: NUTRIENT UPGRADES — TROPHIC SYSTEMS**

- **UPG: EXOENZYME_CASCADE** — Fungi digest externally by secreting enzymes before absorbing. More enzymes yield more extractable material. Effect: increases Nutrient gain per harvest cycle.

- **UPG: CHITIN_RECYCLING** — Breaking down old hyphal walls to reclaim structural nutrients. Effect: reduces Nutrient cost of growth actions.

- **UPG: RHIZOMORPHIC_NETWORKING** — Thick bundled hyphae that transport nutrients efficiently over long distances. Effect: increases Nutrient generator output.

- **UPG: NITROGEN_FIXATION_SYMBIOSIS** — Some fungi partner with nitrogen-fixing bacteria in the substrate. Effect: unlocks a slow passive Nutrient trickle independent of generators.

## **5.4 :: BIOMASS UPGRADES — STRUCTURAL SYSTEMS**

- **UPG: HYPHAL_DENSITY_PROTOCOL** — Growing more hyphae per unit area, increasing structural mass. Effect: increases Biomass cap.

- **UPG: MELANIN_SHIELDING** — Melanin in fungal cell walls provides structural resilience against environmental stress. Effect: reduces Biomass loss from hostile events.

- **UPG: SPORULATION_BURST** — Redirecting metabolic energy into rapid spore production. Effect: temporary Biomass generation spike on activation, short cooldown.

- **UPG: ANASTOMOSIS_BRIDGES** — Hyphae fusing with each other to share resources across the network. Effect: Biomass passively redistributes to compensate for local deficits.

# **06 :: UI IMPLEMENTATION NOTES**

## **6.1 :: CORE PAGE**

- Resource cards must include \[████░░░░\] progress bar fill indicators on both desktop and mobile — desktop version currently omits these, weakening at-a-glance scanability.

- Water card at critical state (below 35%) should display red border treatment, matching mobile mockup.

## **6.2 :: UPGRADES PAGE**

- Single page with three categorical sections: MYCELIAL NETWORK, INCURSION PROTOCOLS, STRUCTURAL.

- Each upgrade displays in terminal style: UPG: UPGRADE_NAME followed by effect description.

- Locked upgrades should show prerequisite chain, not just a locked state, to communicate progression path.

# **07 :: OPEN ITEMS / NEXT PHASE**

- Combat upgrades (INCURSION PROTOCOLS section) — to be designed and added.

- Lysate decay rate — needs numerical definition and playtesting.

- Generator replenishment speed — determines final threshold calibration.

- Cap expansion cost curve for Lysate spending — needs simulation.

- Upgrade tier structure and prerequisite chains — not yet defined.

MYCOSURGE :: IMPLEMENTATION PLAN :: END OF DOCUMENT
