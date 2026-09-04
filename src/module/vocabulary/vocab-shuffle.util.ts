/**
 * Fisher-Yates shuffle (Durstenfeld variant) — in-place, unbiased O(n).
 * Use for already-materialized arrays; pairs well with bounded `findMany({ take })`.
 */
export function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Take N random elements without biasing toward leading rows.
 * Reads at most N+M rows (M for retry-buffer) instead of pulling all.
 */
export function takeRandom<T>(arr: readonly T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  if (arr.length <= n) return fisherYatesShuffle(arr);
  return fisherYatesShuffle(arr).slice(0, n);
}
