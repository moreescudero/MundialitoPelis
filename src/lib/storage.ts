import type { LbFilm, MatchCard } from "./types";

export interface PersonList {
  label: string;
  /** usuario de Letterboxd, o null si vino de un CSV */
  username: string | null;
  films: LbFilm[];
}

export interface SetupState {
  a: PersonList | null;
  b: PersonList | null;
  /** coincidencias ya resueltas contra TMDB */
  matches: MatchCard[];
  /** slugs que se quitaron a mano de las coincidencias */
  removed: string[];
}

const KEY = "mundial-peliculas:setup:v1";

export const emptySetup: SetupState = { a: null, b: null, matches: [], removed: [] };

let cache: SetupState | null = null;
const listeners = new Set<() => void>();

function read(): SetupState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptySetup, ...JSON.parse(raw) } : emptySetup;
  } catch {
    return emptySetup;
  }
}

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
