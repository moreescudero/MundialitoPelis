import type { MatchCard } from "./types";

/** Generador pseudoaleatorio con semilla: mismo orden para la misma semilla. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed?: number): T[] {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Intercala dos listas: a1, b1, a2, b2... y sigue con lo que sobre. */
export function interleave<A, B>(a: A[], b: B[]): (A | B)[] {
  const out: (A | B)[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/**
 * Puntaje para elegir cabezas de serie: la nota de TMDB pesada por la cantidad de votos,
 * así una película con 9.0 y 12 votos no le gana a una con 8.4 y 20.000.
 */
export function seedScore(m: Pick<MatchCard, "rating" | "votes">): number {
  const prior = 6.5;
  const weight = 500;
  const rating = m.rating ?? prior;
  return (m.votes / (m.votes + weight)) * rating + (weight / (m.votes + weight)) * prior;
}

export const SIZES = [8, 16, 32, 64] as const;

/** Menor tamaño de mundial (8, 16, 32 o 64) que alcanza para `count` películas. */
export const defaultSize = (count: number): number => SIZES.find((s) => s >= count) ?? 64;
