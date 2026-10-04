export type PanelId = 'evolution' | 'expeditions' | 'map' | 'bestiary';

/**
 * Overlay state for the full-screen systems. The game is a single view now, so
 * Evolution / Expeditions open as drawers instead of routes. Combat is layered on
 * top of the single view when a host is engaged (Hunt).
 */
export function createUiStore() {
  let activePanel = $state<PanelId | null>(null);
  let combatHostId = $state<string | null>(null);

  function hasOverlay(): boolean {
    return activePanel !== null || combatHostId !== null;
  }

  function openPanel(id: PanelId) {
    activePanel = id;
  }

  function closePanel() {
    activePanel = null;
    combatHostId = null;
  }

  function openCombat(hostId: string) {
    combatHostId = hostId;
  }

  function closeCombat() {
    combatHostId = null;
  }

  function closeTop() {
    if (combatHostId !== null) {
      combatHostId = null;
    } else {
      activePanel = null;
    }
  }

  function closeAll() {
    activePanel = null;
    combatHostId = null;
  }

  return {
    get activePanel() {
      return activePanel;
    },
    get combatHostId() {
      return combatHostId;
    },
    get hasOverlay() {
      return hasOverlay();
    },
    openPanel,
    closePanel,
    openCombat,
    closeCombat,
    closeTop,
    closeAll,
  };
}

export const uiStore = createUiStore();
