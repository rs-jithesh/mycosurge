import { HOSTS } from '@mycosurge/config';
import type { CombatStats, GameState } from './state';

/**
 * Aggregated bonuses granted by acquired evolutionary echoes. Every field is
 * additive/normalised so multiple echoes stack cleanly.
 */
export interface EchoEffects {
  /** Multiplier bonus to passive Biomass generation (0.05 = +5%). */
  biomassMult: number;
  /** Bonus to spore fire rate (0.08 = +8%). */
  fireRateMult: number;
  /** Bonus to spore damage (0.15 = +15%). */
  damageMult: number;
  /** Extra poison damage per second applied by spores. */
  poisonDamage: number;
  /** Extra passive HP regen per second in combat. */
  hpRegen: number;
  /** Bonus to player movement speed in the arena (0.1 = +10%). */
  moveSpeedBonus: number;
  /** Bonus to the post-hit invulnerability window (0.15 = +15%). */
  dodgeWindowBonus: number;
  /** Chance per hit to evade an antibody entirely (0.12 = 12%). */
  evadeChance: number;
  /** Extra genome points added to the mutation budget. */
  genomePoints: number;
}

const BASE_EFFECTS: EchoEffects = {
  biomassMult: 0,
  fireRateMult: 0,
  damageMult: 0,
  poisonDamage: 0,
  hpRegen: 0,
  moveSpeedBonus: 0,
  dodgeWindowBonus: 0,
  evadeChance: 0,
  genomePoints: 0,
};

/** Resolve a list of acquired echo ids into their combined bonuses. */
export function getEchoEffects(acquiredEchoes: readonly string[]): EchoEffects {
  const effects: EchoEffects = { ...BASE_EFFECTS };

  for (const id of acquiredEchoes) {
    switch (id) {
      case 'echo_nematode':
        effects.biomassMult += 0.03;
        break;
      case 'echo_leaf':
        effects.biomassMult += 0.05;
        break;
      case 'echo_beetle':
        effects.poisonDamage += 2;
        break;
      case 'echo_mouse':
        effects.moveSpeedBonus += 0.1;
        break;
      case 'echo_pigeon':
        effects.fireRateMult += 0.08;
        break;
      case 'echo_cat':
        effects.dodgeWindowBonus += 0.15;
        break;
      case 'echo_lab':
        effects.genomePoints += 3;
        break;
      case 'echo_worm':
        effects.hpRegen += 1;
        break;
      case 'echo_frog':
        effects.evadeChance += 0.12;
        break;
      case 'echo_squirrel':
        effects.fireRateMult += 0.1;
        break;
      case 'echo_raccoon':
        effects.damageMult += 0.15;
        break;
      default:
        break;
    }
  }

  return effects;
}

/** Combat stats after echoes are applied, including arena-only modifiers. */
export function getEffectiveCombatStats(state: GameState): CombatStats {
  const base = state.combatStats;
  const echo = getEchoEffects(state.acquiredEchoes);

  return {
    ...base,
    damage: base.damage * (1 + echo.damageMult),
    fireRate: base.fireRate * (1 + echo.fireRateMult),
    hpRegen: base.hpRegen + echo.hpRegen,
    poisonDamage: base.poisonDamage + echo.poisonDamage,
    moveSpeedMult: 1 + echo.moveSpeedBonus,
    dodgeWindowMult: 1 + echo.dodgeWindowBonus,
    evadeChance: echo.evadeChance,
  };
}

/** Display name for an echo id (falls back to the raw id). */
export function getEchoName(echoId: string): string {
  const host = HOSTS.find((h) => h.echoes.id === echoId);
  return host?.echoes.name ?? echoId;
}

/** Description of the trait an echo grants (falls back to an empty string). */
export function getEchoDescription(echoId: string): string {
  const host = HOSTS.find((h) => h.echoes.id === echoId);
  return host?.echoes.description ?? '';
}
