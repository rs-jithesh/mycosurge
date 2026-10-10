import { RESOURCES } from '@mycosurge/config';
import type { ResourceId } from '@mycosurge/config';
import type { Tone } from './onboarding';

/**
 * Icon registry. Each key maps to a PNG in `static/assets/icons/<file>`; `glyph` is the
 * Unicode fallback rendered until the PNG exists (see ASSET-PLAN.md).
 *
 * Resource glyphs/labels/tones are **not** duplicated here — they live in
 * `@mycosurge/config` `RESOURCES`; resource keys only contribute their PNG `file`.
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
  | 'spore'
  | 'soil_nematode';

export interface IconMeta {
  file: string;
  glyph?: string;
  label?: string;
  tone?: Tone;
}

export const ICON_META: Record<IconKey, IconMeta> = {
  // Resources: PNG only — glyph/label/tone resolve from RESOURCES.
  water: { file: 'water.png' },
  nutrients: { file: 'nutrients.png' },
  biomass: { file: 'biomass.png' },
  lysate: { file: 'lysate.png' },

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

  spore: { file: 'spore.png', glyph: '•', label: 'Spore', tone: 'mint' },

  soil_nematode: { file: 'soil_nematode.png', glyph: 'N', label: 'Soil Nematode', tone: 'coral' },
};

export const ICON_KEYS = Object.keys(ICON_META) as IconKey[];

const HOST_ICON_KEYS = ['soil_nematode'] as const;

const HOST_ICON_SET: ReadonlySet<string> = new Set(HOST_ICON_KEYS);

/** Resolve a host id to its icon key, or null when it has no raster icon. */
export function hostIconKey(id: string): IconKey | null {
  return HOST_ICON_SET.has(id) ? (id as IconKey) : null;
}

/** Anything `<ResourceIcon>` can render: a registry key or a resource id. */
export type IconName = IconKey | ResourceId;

export interface ResolvedIcon {
  /** PNG filename, or null when there is no raster asset (fall back to the glyph). */
  file: string | null;
  glyph: string;
  label: string;
  tone: Tone;
  description?: string;
}

function isResource(name: IconName): name is ResourceId {
  return Object.prototype.hasOwnProperty.call(RESOURCES, name);
}

/**
 * Resolve an icon name to everything the renderer needs. Resources pull their glyph/label/
 * tone/description from `RESOURCES`; everything else falls back to `ICON_META`.
 */
export function resolveIcon(name: IconName): ResolvedIcon {
  if (isResource(name)) {
    const resource = RESOURCES[name];
    const file = (ICON_META as Record<string, IconMeta | undefined>)[name]?.file ?? null;
    return {
      file,
      glyph: resource.symbol,
      label: resource.name,
      tone: resource.tone,
      description: resource.description,
    };
  }
  const meta = ICON_META[name];
  return {
    file: meta.file,
    glyph: meta.glyph ?? '•',
    label: meta.label ?? name,
    tone: meta.tone ?? 'mint',
  };
}
