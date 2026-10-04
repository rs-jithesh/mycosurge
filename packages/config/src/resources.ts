export type ResourceId = 'water' | 'nutrients' | 'biomass' | 'lysate' | 'reach';
export type ResourceTone = 'cyan' | 'violet' | 'mint' | 'amber';

export interface ResourceMeta {
  id: ResourceId;
  name: string;
  /** Lowercase Greek notation, used in the HUD once the tutorial has introduced it. */
  symbol: string;
  tone: ResourceTone;
  /** One-line role, shown in the resource tooltip. */
  description: string;
}

/**
 * The single source of truth for how resources are named and denoted. The tutorial spells a
 * resource out with its symbol in brackets; the full-game HUD uses the bare symbol.
 */
export const RESOURCES: Record<ResourceId, ResourceMeta> = {
  water: {
    id: 'water',
    name: 'Water',
    symbol: 'ψ',
    tone: 'cyan',
    description: 'Passive base resource. Generators produce it; it drains over time.',
  },
  nutrients: {
    id: 'nutrients',
    name: 'Nutrients',
    symbol: 'ν',
    tone: 'violet',
    description: 'Fed to Biomass synthesis. Generators produce it; it drains over time.',
  },
  biomass: {
    id: 'biomass',
    name: 'Biomass',
    symbol: 'β',
    tone: 'mint',
    description: 'Extends your reach and buys generator upgrades.',
  },
  lysate: {
    id: 'lysate',
    name: 'Lysate',
    symbol: 'λ',
    tone: 'amber',
    description: 'Won in combat. Spend it to raise resource caps and evolve.',
  },
  reach: {
    id: 'reach',
    name: 'Reach',
    symbol: 'μ',
    tone: 'mint',
    description:
      'How far the network spreads. Deeper reach opens stronger hosts but costs more Water and Nutrients to maintain.',
  },
};

export function resourceName(id: ResourceId): string {
  return RESOURCES[id].name;
}

export function resourceSymbol(id: ResourceId): string {
  return RESOURCES[id].symbol;
}

export type ResourceLabelStyle = 'name' | 'symbol' | 'first';

/** `Water`, `ψ`, or `Water (ψ)`. Defaults to the bare symbol. */
export function resourceLabel(id: ResourceId, style: ResourceLabelStyle = 'symbol'): string {
  const { name, symbol } = RESOURCES[id];
  if (style === 'name') return name;
  if (style === 'first') return `${name} (${symbol})`;
  return symbol;
}

/** `5 ψ` — an amount followed by the resource symbol. */
export function resourceAmount(id: ResourceId, amount: number | string): string {
  return `${amount} ${RESOURCES[id].symbol}`;
}
