import { describe, expect, it } from 'vitest';
import { createUiStore } from './ui.svelte';

describe('ui store overlays', () => {
  it('opens a panel', () => {
    const ui = createUiStore();
    expect(ui.hasOverlay).toBe(false);
    ui.openPanel('bestiary');
    expect(ui.activePanel).toBe('bestiary');
    expect(ui.hasOverlay).toBe(true);
  });

  it('layers combat over a panel and closes it first', () => {
    const ui = createUiStore();
    ui.openPanel('bestiary');
    ui.openCombat('soil_nematode');
    expect(ui.combatHostId).toBe('soil_nematode');

    ui.closeTop();
    expect(ui.combatHostId).toBeNull();
    expect(ui.activePanel).toBe('bestiary');

    ui.closeTop();
    expect(ui.activePanel).toBeNull();
    expect(ui.hasOverlay).toBe(false);
  });

  it('closeAll clears both layers', () => {
    const ui = createUiStore();
    ui.openPanel('bestiary');
    ui.openCombat('seasonal_mite');
    ui.closeAll();
    expect(ui.activePanel).toBeNull();
    expect(ui.combatHostId).toBeNull();
  });

  it('opening a different panel replaces the current one', () => {
    const ui = createUiStore();
    ui.openPanel('resources');
    ui.openPanel('bestiary');
    expect(ui.activePanel).toBe('bestiary');
  });
});
