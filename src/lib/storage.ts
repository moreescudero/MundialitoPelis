import type { Bracket } from "./bracket";
import type { Entry, LbFilm, MatchCard } from "./types";

export interface PersonList {
  label: string;
  /** usuario de Letterboxd, o null si vino de un CSV */
  username: string | null;
  films: LbFilm[];
}

export type SeedMode = "random" | "seeded";

export interface SetupState {
  a: PersonList | null;
  b: PersonList | null;
  /** coincidencias ya resueltas contra TMDB */
  matches: MatchCard[];
  /** slugs que se quitaron a mano de las coincidencias */
  removed: string[];
  /** películas sumadas para completar el cuadro (sugeridas o buscadas) */
  extras: Entry[];
  /** sugerencias descartadas */
  dismissed: string[];
  /** semilla para mezclar las sugerencias */
  suggestSeed: number;
  /** tamaño elegido para el mundial; null = el sugerido */
  size: number | null;
  seedMode: SeedMode;
  /** llave sorteada; null hasta que se sortea */
  bracket: Bracket | null;
}

const KEY = "mundial-peliculas:setup:v2";

export const emptySetup: SetupState = {
  a: null,
  b: null,
  matches: [],
  removed: [],
  extras: [],
  dismissed: [],
  suggestSeed: 1,
  size: null,
  seedMode: "random",
  bracket: null,
};

/** Las películas que hoy están en el mundial: coincidencias no quitadas + las sumadas. */
export function getEntries(s: SetupState): Entry[] {
  const removed = new Set(s.removed);
  const both: Entry[] = s.matches.filter((m) => !removed.has(m.slug)).map((m) => ({ ...m, source: "both" }));
  return [...both, ...s.extras];
}

function read(): SetupState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptySetup, ...JSON.parse(raw) } : emptySetup;
  } catch {
    return emptySetup;
  }
}

let cache: SetupState | null = null;
const listeners = new Set<() => void>();

/** Store mínimo para useSyncExternalStore: el estado vive en localStorage. */
export const setupStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot(): SetupState {
    return (cache ??= read());
  },
  getServerSnapshot(): SetupState {
    return emptySetup;
  },
  update(fn: (s: SetupState) => SetupState) {
    cache = fn(cache ?? read());
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      // sin almacenamiento disponible: la app sigue funcionando, solo no recuerda
    }
    listeners.forEach((l) => l());
  },
};
