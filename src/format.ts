const PREFIXES: [number, string][] = [[1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
/** Engineering-notation formatter with SI prefix, e.g. eng(0.0123,'V') → "12.3 mV". */
export function eng(x: number, unit: string): string {
  const a = Math.abs(x);
  if (a < 1e-12) return `0 ${unit}`;
  const [scale, p] = PREFIXES.find(([s]) => a >= s) ?? PREFIXES[3];
  return `${(x / scale).toPrecision(3)} ${p}${unit}`.replace('-', '−');
}
