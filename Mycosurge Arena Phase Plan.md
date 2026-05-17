# **Mycosurge: RADAR and Arena Phase Implementation Plan**

## **Context**

This document outlines the transition from the text-based idle economy to the active combat phase in Mycosurge, developed using Svelte and Pixi.js. The game shifts from a UI-driven resource manager to a 2D bullet hell arena when confronting hostile hosts.

## **The Penalty Paradigm**

When a player fails an arena encounter, simply losing resources can feel unrewarding or frustrating in an idle game. Instead of just a flat resource tax, the penalty should tie into the narrative of a fragile fungal organism:

1. **"Hyphal Retreat" (Core Penalty):** Upon defeat, the player loses the progress made on their current Hyphal Expansion distance (e.g., losing 2mm of the 5mm required). This forces them to reinvest idle time and Biomass to re-trigger the encounter, reinforcing the idea that the physical network was pushed back.
2. **"Biomass Burn":** A small percentage of stored Biomass is consumed as the organism rapidly attempts to repair the damaged network core.
3. **"Temporary Shock":** Idle resource generation rates are halved for a short cooldown period (e.g., 60 seconds) while the network recovers its structural integrity.

## **Implementation Flow**

### **Step 1: The Breach Alert**

When the player's Hyphal distance reaches a specific milestone (e.g., 5mm) via the text UI, idle generation is interrupted. A prominent visual cue (like a pulsing red icon) appears on the 'RADAR' sidebar tab. The main log reads: _CRITICAL: Hostile contact. Expansion halted._

### **Step 2: The RADAR Scan**

The player navigates to the RADAR tab. This view is initially text-based. The player clicks a \[Scan Substrate\] button (costing a small amount of Water). The log reveals the threat: _Vibrations triangulated. Root-Knot Nematode located._ A large \[Engage Host\] button appears.

### **Step 3: The Arena Transition (Pixi.js)**

Clicking \[Engage Host\] conditionally renders the Pixi.js canvas component, taking over the view area. The player controls a central spore cluster using mobile-friendly touch-and-drag controls. The spore auto-fires at the host entity, and the player must dodge incoming acid patterns.

### **Step 4: The Outcome & Modal**

Whether the player wins or loses, the combat loop concludes by displaying an overlaid UI Modal containing the After-Action Report.

- **Victory Modal:**
  - **Summary:** "Threat Neutralized. Assimilation Complete."
  - **Rewards:** Lists the massive influx of unique resources gained (e.g., "+50 Nematode DNA", "+100 Biomass").
  - **Actions:** Offers a button to \[RETREAT\] (closes the modal, unmounts the Pixi canvas, returns to economy view) or \[SCAN\] (spends resources to immediately search for another threat without returning to the economy).
- **Defeat Modal:**
  - **Summary:** "Network Breached. Critical Damage Sustained."
  - **Penalties:** Lists the applied penalties (e.g., "-2mm Hyphal Distance", "-10% Stored Biomass").
  - **Actions:** Offers a button to \[RETREAT\] (closes the modal, unmounts the Pixi canvas, returns to economy view to rebuild).

## **Development Prompt**

_Copy the text below to feed into an AI assistant or development environment to generate the Svelte component logic and Pixi.js integration._

**Prompt:**

Act as a senior frontend engineer. I am building a mobile-first web game using Svelte and Pixi.js. The game features two distinct gameplay modes that share state: a text-based idle UI and a 2D bullet hell arena.

Please outline the architecture and provide structural Svelte component code examples for the following:

1. **State Management (Svelte Stores):** Create a writable store snippet to hold shared game state (Water, Biomass, HyphalDistance, PlayerMaxHealth, PlayerDamage, CombatStatus).
2. **The Svelte UI Transition:** Implement a parent component structure that uses Svelte's conditional rendering ({\#if ...}) to safely swap between the text-based DOM elements and a mounted Pixi.js canvas component when a specific state flag (e.g., isCombatActive) is triggered.
3. **The Pixi.js Svelte Integration:** Provide a basic Svelte component that initializes a Pixi.js application within an onMount lifecycle hook, ensuring it is responsive to a mobile screen. Ensure the Pixi instance is properly destroyed in the onDestroy hook.
4. **The Input Setup:** Implement a basic touch-and-drag event listener in the Pixi.js setup to control a simple 'player' graphic (a circle or sprite), ensuring the movement feels snappy on a touch device.
5. **The Outcome Modal:** Create a Svelte modal component that triggers when combat ends (either victory or defeat). The modal should display a summary of resources gained or lost, and provide at least two buttons: \[RETREAT\] (which updates state to unmount the canvas and return to the idle UI) and \[SCAN\] (which attempts to trigger a new encounter).
