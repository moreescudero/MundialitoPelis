/** Llave de eliminación directa. Las películas se identifican por slug. */

export interface BracketMatch {
  a: string | null;
  b: string | null;
  winner: string | null;
}

export interface Bracket {
  /** rounds[0] es la primera ronda; la última tiene un solo partido (la final) */
  rounds: BracketMatch[][];
  /** votos en orden, para poder deshacer el último: [ronda, partido] */
  history?: [number, number][];
}

const isPowerOfTwo = (n: number) => n >= 2 && (n & (n - 1)) === 0;

/**
 * Posiciones de cabeza de serie en la llave: [1, 8, 4, 5, 2, 7, 3, 6] para 8.
 * Emparejados de a dos dan 1-8, 4-5, 2-7, 3-6, y los mejores se cruzan lo más tarde posible.
 */
export function seedOrder(n: number): number[] {
  if (!isPowerOfTwo(n)) throw new Error(`El tamaño debe ser potencia de 2 (recibí ${n}).`);
  let order = [1, 2];
  while (order.length < n) {
    const total = order.length * 2 + 1;
    order = order.flatMap((s) => [s, total - s]);
  }
  return order;
}

/** `order` son los slugs en el orden de la llave: cada par consecutivo se enfrenta. */
export function createBracket(order: string[]): Bracket {
  if (!isPowerOfTwo(order.length)) {
    throw new Error(`Hacen falta 2, 4, 8, 16, 32 o 64 películas (recibí ${order.length}).`);
  }
  if (new Set(order).size !== order.length) throw new Error("Hay películas repetidas en la llave.");

  const rounds: BracketMatch[][] = [
    Array.from({ length: order.length / 2 }, (_, i) => ({
      a: order[2 * i],
      b: order[2 * i + 1],
      winner: null,
    })),
  ];
  while (rounds[rounds.length - 1].length > 1) {
    const size = rounds[rounds.length - 1].length / 2;
    rounds.push(Array.from({ length: size }, () => ({ a: null, b: null, winner: null })));
  }
  return { rounds };
}

const slotOf = (index: number) => (index % 2 === 0 ? "a" : "b");

/** Borra el ganador de un partido y todo lo que de él dependía en rondas siguientes. */
function reset(rounds: BracketMatch[][], round: number, index: number) {
  const match = rounds[round][index];
  const had = match.winner;
  match.winner = null;
  const next = rounds[round + 1]?.[index >> 1];
  if (next && had !== null) {
    const slot = slotOf(index);
    if (next[slot] === had) {
      next[slot] = null;
      reset(rounds, round + 1, index >> 1);
    }
  }
}

export function pickWinner(bracket: Bracket, round: number, index: number, slug: string): Bracket {
  const rounds = structuredClone(bracket.rounds);
  const history = [...(bracket.history ?? [])];
  const match = rounds[round]?.[index];
  if (!match) throw new Error("Ese partido no existe.");
  if (slug !== match.a && slug !== match.b) throw new Error("Esa película no juega este partido.");
  if (match.winner === slug) return bracket;

  reset(rounds, round, index);
  match.winner = slug;
  const next = rounds[round + 1]?.[index >> 1];
  if (next) next[slotOf(index)] = slug;
  history.push([round, index]);
  return { rounds, history };
}

/** Deshace el último voto que siga vigente. */
export function undoLast(bracket: Bracket): Bracket {
  const history = [...(bracket.history ?? [])];
  while (history.length) {
    const [round, index] = history.pop()!;
    if (bracket.rounds[round][index].winner) {
      const rounds = structuredClone(bracket.rounds);
      reset(rounds, round, index);
      return { rounds, history };
    }
  }
  return bracket;
}

export function clearWinner(bracket: Bracket, round: number, index: number): Bracket {
  const rounds = structuredClone(bracket.rounds);
  if (!rounds[round]?.[index]) throw new Error("Ese partido no existe.");
  reset(rounds, round, index);
  return { rounds, history: bracket.history };
}

/** Primer partido pendiente con las dos películas ya definidas. */
export function nextMatch(bracket: Bracket): { round: number; index: number } | null {
  for (let r = 0; r < bracket.rounds.length; r++) {
    const index = bracket.rounds[r].findIndex((m) => m.a && m.b && !m.winner);
    if (index >= 0) return { round: r, index };
  }
  return null;
}

export function champion(bracket: Bracket): string | null {
  return bracket.rounds[bracket.rounds.length - 1][0].winner;
}

export function progress(bracket: Bracket) {
  const all = bracket.rounds.flat();
  return { played: all.filter((m) => m.winner).length, total: all.length };
}

export function roundName(bracket: Bracket, round: number): string {
  const count = bracket.rounds[round].length;
  if (count === 1) return "Final";
  if (count === 2) return "Semifinales";
  if (count === 4) return "Cuartos de final";
  if (count === 8) return "Octavos de final";
  return `${count}avos de final`;
}
