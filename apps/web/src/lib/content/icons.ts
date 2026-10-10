import { RESOURCES } from '@mycosurge/config';
import type { ResourceId } from '@mycosurge/config';
import type { Tone } from './onboarding';

/**
 * Icon registry. Every icon renders as a **Unicode glyph** for now (Greek symbols for
 * resources); raster artwork is deferred — see ASSET-PLAN.md.
 *
 * Resource glyphs/labels/tones are **not** duplicated here — they live in
 * `@mycosurge/config` `RESOURCES`; this registry only covers non-resource icons.
 */
export type IconKey =
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
  glyph: string;
  label: string;
  tone: Tone;
}

export const ICON_META: Record<IconKey, IconMeta> = {
  core: { glyph: '◎', label: 'Core', tone: 'mint' },
  radar: { glyph: '◎', label: 'Radar', tone: 'cyan' },
  evolution: { glyph: '❖', label: 'Evolution', tone: 'mint' },

  gather: { glyph: '≋', label: 'Gather', tone: 'cyan' },
  grow: { glyph: '✦', label: 'Grow', tone: 'amber' },
  hunt: { glyph: '◈', label: 'Hunt', tone: 'coral' },
  expand: { glyph: '⬡', label: 'Expand', tone: 'mint' },

  osmotic_pump: { glyph: '≋', label: 'Osmotic Pump', tone: 'cyan' },
  enzymatic_exudates: { glyph: '✦', label: 'Enzymatic Exudates', tone: 'violet' },

  spore: { glyph: '•', label: 'Spore', tone: 'mint' },

  soil_nematode: { glyph: 'N', label: 'Soil Nematode', tone: 'coral' },
};

export const ICON_KEYS = Object.keys(ICON_META) as IconKey[];

const HOST_ICON_KEYS = ['soil_nematode'] as const;

const HOST_ICON_SET: ReadonlySet<string> = new Set(HOST_ICON_KEYS);

/** Resolve a host id to its icon key, or null when it has no icon. */
export function hostIconKey(id: string): IconKey | null {
  return HOST_ICON_SET.has(id) ? (id as IconKey) : null;
}

/** Anything `<ResourceIcon>` can render: a registry key or a resource id. */
export type IconName = IconKey | ResourceId;

export interface ResolvedIcon {
  glyph: string;
  label: string;
  tone: Tone;
  description?: string;
}

function isResource(name: IconName): name is ResourceId {
  return Object.prototype.hasOwnProperty.call(RESOURCES, name);
}

/**
 * Resolve an icon name to a glyph, label and tone. Resources pull all three from
 * `RESOURCES`; everything else falls back to `ICON_META`.
 */
export function resolveIcon(name: IconName): ResolvedIcon {
  if (isResource(name)) {
    const resource = RESOURCES[name];
    return {
      glyph: resource.symbol,
      label: resource.name,
      tone: resource.tone,
      description: resource.description,
    };
  }
  const meta = ICON_META[name];
  return { glyph: meta.glyph, label: meta.label, tone: meta.tone };
}
