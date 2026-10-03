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
  | 'echo'
  | 'core'
  | 'radar'
  | 'evolution'
  | 'expeditions'
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
  | 'soil_nematode'
  | 'fallen_leaf'
  | 'garden_beetle'
  | 'field_mouse'
  | 'urban_pigeon'
  | 'stray_cat'
  | 'lab_rat'
  | 'compost_worm'
  | 'pond_frog'
  | 'backyard_squirrel'
  | 'feral_raccoon';

export interface IconMeta {
  file: string;
  glyph: string;
  label: string;
  tone: Tone;
}

export const ICON_META: Record<IconKey, IconMeta> = {
  water: { file: 'water.png', glyph: '≋', label: 'Water', tone: 'cyan' },
  nutrients: { file: 'nutrients.png', glyph: '✦', label: 'Nutrients', tone: 'violet' },
  biomass: { file: 'biomass.png', glyph: '❋', label: 'Biomass', tone: 'mint' },
  lysate: { file: 'lysate.png', glyph: '⬡', label: 'Lysate', tone: 'amber' },
  echo: { file: 'echo.png', glyph: '❂', label: 'Echo', tone: 'amber' },
  core: { file: 'core.png', glyph: '◎', label: 'Core', tone: 'mint' },

  radar: { file: 'radar.png', glyph: '◎', label: 'Radar', tone: 'cyan' },
  evolution: { file: 'evolution.png', glyph: '❖', label: 'Evolution', tone: 'mint' },
  expeditions: { file: 'expeditions.png', glyph: '➤', label: 'Expeditions', tone: 'amber' },

  gather: { file: 'gather.png', glyph: '≋', label: 'Gather', tone: 'cyan' },
  grow: { file: 'grow.png', glyph: '✦', label: 'Grow', tone: 'amber' },
  hunt: { file: 'hunt.png', glyph: '◈', label: 'Hunt', tone: 'coral' },
  expand: { file: 'expand.png', glyph: '⬡', label: 'Evolve', tone: 'mint' },

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
  fallen_leaf: { file: 'fallen_leaf.png', glyph: 'L', label: 'Fallen Leaf', tone: 'mint' },
  garden_beetle: { file: 'garden_beetle.png', glyph: 'B', label: 'Garden Beetle', tone: 'amber' },
  field_mouse: { file: 'field_mouse.png', glyph: 'M', label: 'Field Mouse', tone: 'coral' },
  urban_pigeon: { file: 'urban_pigeon.png', glyph: 'P', label: 'Urban Pigeon', tone: 'cyan' },
  stray_cat: { file: 'stray_cat.png', glyph: 'C', label: 'Stray Cat', tone: 'amber' },
  lab_rat: { file: 'lab_rat.png', glyph: 'R', label: 'Laboratory Rat', tone: 'coral' },
  compost_worm: { file: 'compost_worm.png', glyph: 'W', label: 'Compost Worm', tone: 'mint' },
  pond_frog: { file: 'pond_frog.png', glyph: 'F', label: 'Pond Frog', tone: 'cyan' },
  backyard_squirrel: {
    file: 'backyard_squirrel.png',
    glyph: 'S',
    label: 'Backyard Squirrel',
    tone: 'amber',
  },
  feral_raccoon: { file: 'feral_raccoon.png', glyph: 'K', label: 'Feral Raccoon', tone: 'coral' },
};

export const ICON_KEYS = Object.keys(ICON_META) as IconKey[];
