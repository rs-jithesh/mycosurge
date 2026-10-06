/**
 * Round a number to a fixed decimal precision, dropping float noise and trailing zeros
 * (e.g. `0.1 * 3` → `0.3`). Returns a number, so callers can format as they like.
 */
export function numberPrecision(value: number, precision = 2): number {
  if (!Number.isFinite(value)) return value;
  const rounded = Number.parseFloat(value.toFixed(precision));
  return Object.is(rounded, -0) ? 0 : rounded;
}
