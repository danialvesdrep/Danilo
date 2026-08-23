/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 *
 * Todo dado de DEMONSTRAÇÃO do Atlas SP é derivado daqui: a mesma semente
 * produz sempre o mesmo conjunto, de modo que a demonstração é reprodutível
 * e auditável. Nenhum dado real é gerado por este módulo — tudo que passa
 * por aqui é gravado com `isDemo: true` e rotulado na interface.
 */
export function createRng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Número real em [min, max). */
    float: (min: number, max: number) => min + next() * (max - min),
    /** Inteiro em [min, max]. */
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    /** Elemento aleatório de uma lista. */
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    /** N elementos distintos, preservando determinismo. */
    sample: <T>(items: readonly T[], count: number): T[] => {
      const pool = [...items];
      const out: T[] = [];
      const take = Math.min(count, pool.length);
      for (let i = 0; i < take; i++) {
        out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      }
      return out;
    },
    /** Verdadeiro com probabilidade `p`. */
    chance: (p: number) => next() < p,
    /** Distribuição aproximadamente normal (soma de uniformes). */
    normal: (mean: number, stdDev: number) => {
      const u = (next() + next() + next() + next() + next() + next()) / 6;
      return mean + (u - 0.5) * 2 * Math.sqrt(3) * stdDev * 2;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
