export interface CastMember {
  name: string;
  character: string;
  photo: string | null;
}

export interface Ratings {
  imdb: string | null;
  rottenTomatoes: string | null;
  metacritic: string | null;
  tmdb: number | null;
}

export interface Movie {
  tmdbId: number;
  imdbId: string | null;
  title: string;
  originalTitle: string;
  year: number | null;
  releaseDate: string | null;
  poster: string | null;
  backdrop: string | null;
  directors: string[];
  cast: CastMember[];
  overview: string;
  tagline: string | null;
  genres: string[];
  runtime: number | null;
  ratings: Ratings;
  awards: string | null;
  trivia: string[];
}

/** Una película de una watchlist de Letterboxd. El slug identifica la película. */
export interface LbFilm {
  slug: string;
  name: string;
  year: number | null;
}

/** Película ya resuelta contra TMDB, lista para mostrar como tarjeta. */
export interface MatchCard {
  slug: string;
  tmdbId: number;
  title: string;
  year: number | null;
  poster: string | null;
  /** nota promedio de TMDB (0-10) y cantidad de votos, para ordenar cabezas de serie */
  rating: number | null;
  votes: number;
}

/** De dónde vino una película del mundial. */
export type EntrySource = "both" | "a" | "b" | "manual";

export interface Entry extends MatchCard {
  source: EntrySource;
}
