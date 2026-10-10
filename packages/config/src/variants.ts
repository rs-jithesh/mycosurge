export type VariantId = 'normal' | 'swift' | 'armored' | 'bloated';

export interface VariantDef {
  id: VariantId;
  name: string;
  description: string;
  weight: number;
  rewardMult: number;
  lysateMult: number;
  hpMult: number;
  speedMult: number;
}

export const VARIANTS: VariantDef[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'No unusual traits.',
    weight: 72,
    rewardMult: 1,
    lysateMult: 1,
    hpMult: 1,
    speedMult: 1,
  },
  {
    id: 'swift',
    name: 'Swift',
    description: 'Strikes faster — worth more.',
    weight: 10,
    rewardMult: 1.25,
    lysateMult: 1,
    hpMult: 1,
    speedMult: 1.3,
  },
  {
    id: 'armored',
    name: 'Armored',
    description: 'Tougher hide — worth more.',
    weight: 10,
    rewardMult: 1.3,
    lysateMult: 1,
    hpMult: 1.5,
    speedMult: 1,
  },
  {
    id: 'bloated',
    name: 'Bloated',
    description: 'Slow and rich in Lysate.',
    weight: 8,
    rewardMult: 1.6,
    lysateMult: 1.5,
    hpMult: 1,
    speedMult: 0.85,
  },
];

export function getVariant(id: string): VariantDef {
  return VARIANTS.find((s) => s.id === id) ?? VARIANTS[0];
}

export const NORMAL_VARIANT_ID: VariantId = 'normal';
