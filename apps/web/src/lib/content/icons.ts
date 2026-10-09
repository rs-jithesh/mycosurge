import type { Tone } from './onboarding';

/**
 * Raster icon registry. Each key maps to a PNG in `static/assets/icons/<file>`.
 *
 * `glyph` is the Unicode fallback rendered by <ResourceIcon> until the PNG is
 * generated (see ASSET-PLAN.md). Add keys here, then drop the matching PNG in.
 */
export type IconKey =
  | 'water'
  | 'nutrients'
  | 'biomass'
  | 'lysate'
  | 'core'
  | 'radar'
  | 'evolution'
  | 'gather'
  | 'grow'
  | 'hunt'
  | 'expand'
  | 'osmotic_pump'
  | 'enzymatic_exudates'
  | 'mycelial'
  | 'incursion'
  | 'structural'
  | 'aggression'
  | 'resilience'
  | 'proliferation'
  | 'spore'
  | 'pellet'
  | 'normal'
  | 'swift'
  | 'armored'
  | 'bloated'
  | 'soil_nematode';

export interface IconMeta {
  file: string;
  glyph: string;
  label: string;
  tone: Tone;
}

export const ICON_META: Record<IconKey, IconMeta> = {
  water: { file: 'water.png', glyph: 'ψ', label: 'Water', tone: 'cyan' },
  nutrients: { file: 'nutrients.png', glyph: 'ν', label: 'Nutrients', tone: 'violet' },
  biomass: { file: 'biomass.png', glyph: 'β', label: 'Biomass', tone: 'mint' },
  lysate: { file: 'lysate.png', glyph: 'λ', label: 'Lysate', tone: 'amber' },
  core: { file: 'core.png', glyph: '◎', label: 'Core', tone: 'mint' },

  radar: { file: 'radar.png', glyph: '◎', label: 'Radar', tone: 'cyan' },
  evolution: { file: 'evolution.png', glyph: '❖', label: 'Evolution', tone: 'mint' },

  gather: { file: 'gather.png', glyph: '≋', label: 'Gather', tone: 'cyan' },
  grow: { file: 'grow.png', glyph: '✦', label: 'Grow', tone: 'amber' },
  hunt: { file: 'hunt.png', glyph: '◈', label: 'Hunt', tone: 'coral' },
  expand: { file: 'expand.png', glyph: '⬡', label: 'Expand', tone: 'mint' },

  osmotic_pump: { file: 'osmotic_pump.png', glyph: '≋', label: 'Osmotic Pump', tone: 'cyan' },
  enzymatic_exudates: {
    file: 'enzymatic_exudates.png',
    glyph: '✦',
    label: 'Enzymatic Exudates',
    tone: 'violet',
  },

  mycelial: { file: 'mycelial.png', glyph: '❋', label: 'Mycelial', tone: 'mint' },
  incursion: { file: 'incursion.png', glyph: '◈', label: 'Incursion', tone: 'coral' },
  structural: { file: 'structural.png', glyph: '⬡', label: 'Structural', tone: 'amber' },

  aggression: { file: 'aggression.png', glyph: '✹', label: 'Aggression', tone: 'coral' },
  resilience: { file: 'resilience.png', glyph: '❈', label: 'Resilience', tone: 'mint' },
  proliferation: { file: 'proliferation.png', glyph: '❋', label: 'Proliferation', tone: 'violet' },

  spore: { file: 'spore.png', glyph: '•', label: 'Spore', tone: 'mint' },
  pellet: { file: 'pellet.png', glyph: '·', label: 'Pellet', tone: 'coral' },

  normal: { file: 'normal.png', glyph: '○', label: 'Normal strain', tone: 'mint' },
  swift: { file: 'swift.png', glyph: '➤', label: 'Swift strain', tone: 'cyan' },
  armored: { file: 'armored.png', glyph: '⬢', label: 'Armored strain', tone: 'amber' },
  bloated: { file: 'bloated.png', glyph: '⬤', label: 'Bloated strain', tone: 'violet' },

  soil_nematode: { file: 'soil_nematode.png', glyph: 'N', label: 'Soil Nematode', tone: 'coral' },
};

export const ICON_KEYS = Object.keys(ICON_META) as IconKey[];

const HOST_ICON_KEYS = ['soil_nematode'] as const;

const HOST_ICON_SET: ReadonlySet<string> = new Set(HOST_ICON_KEYS);

/** Resolve a host id to its icon key, or null when it has no raster icon. */
export function hostIconKey(id: string): IconKey | null {
  return HOST_ICON_SET.has(id) ? (id as IconKey) : null;
}
