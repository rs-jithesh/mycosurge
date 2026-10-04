import { describe, it, expect } from 'vitest';
import {
  RESOURCES,
  resourceName,
  resourceSymbol,
  resourceLabel,
  resourceAmount,
} from '@mycosurge/config';

describe('resource notation', () => {
  it('uses lowercase Greek symbols for every resource', () => {
    expect(resourceSymbol('water')).toBe('ψ');
    expect(resourceSymbol('nutrients')).toBe('ν');
    expect(resourceSymbol('biomass')).toBe('β');
    expect(resourceSymbol('lysate')).toBe('λ');
  });

  it('keeps readable names alongside the symbols', () => {
    expect(resourceName('water')).toBe('Water');
    expect(resourceName('nutrients')).toBe('Nutrients');
    expect(resourceName('biomass')).toBe('Biomass');
    expect(resourceName('lysate')).toBe('Lysate');
  });

  it('renders name, symbol, and first-mention styles', () => {
    expect(resourceLabel('biomass', 'name')).toBe('Biomass');
    expect(resourceLabel('biomass', 'symbol')).toBe('β');
    expect(resourceLabel('biomass', 'first')).toBe('Biomass (β)');
    expect(resourceLabel('water')).toBe('ψ');
  });

  it('formats amounts as number then symbol', () => {
    expect(resourceAmount('water', 5)).toBe('5 ψ');
    expect(resourceAmount('lysate', '10')).toBe('10 λ');
  });

  it('gives every resource a distinct symbol', () => {
    const symbols = Object.values(RESOURCES).map((r) => r.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});
