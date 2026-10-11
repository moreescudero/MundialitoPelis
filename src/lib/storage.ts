import type { Bracket } from "./bracket";
import type { Entry, LbFilm } from "./types";

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
  /** películas del mundial (sacadas de las dos watchlists o buscadas a mano) */
  entries: Entry[];
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

const KEY = "mundial-peliculas:setup:v3";

export const emptySetup: SetupState = {
  a: null,
  b: null,
  entries: [],
  dismissed: [],
  suggestSeed: 1,
  size: null,
  seedMode: "random",
  bracket: null,
};

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
