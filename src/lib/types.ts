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
