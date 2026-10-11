const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export const posterUrl = (path: string | null, size = "w500") =>
  path ? `${IMG}/${size}${path}` : null;

export const photoUrl = (path: string | null) =>
  path ? `${IMG}/w185${path}` : null;

export const backdropUrl = (path: string | null) =>
  path ? `${IMG}/w1280${path}` : null;

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export interface TmdbMovieRaw {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  tagline: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  vote_average: number;
  budget: number;
  revenue: number;
  genres: { name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  belongs_to_collection: { name: string } | null;
  external_ids: { imdb_id: string | null };
  keywords: { keywords: { name: string }[] };
  credits: {
    cast: { name: string; character: string; profile_path: string | null; order: number }[];
    crew: { name: string; job: string }[];
  };
}

export async function fetchTmdbMovie(id: number): Promise<TmdbMovieRaw> {
  const es = await tmdb<TmdbMovieRaw>(`/movie/${id}`, {
    language: "es-AR",
    append_to_response: "credits,external_ids,keywords",
  });
  // Si no hay sinopsis en español, caer a inglés
  if (!es.overview) {
    const en = await tmdb<{ overview: string; tagline: string }>(`/movie/${id}`, {
      language: "en-US",
    });
    es.overview = en.overview;
    if (!es.tagline) es.tagline = en.tagline;
  }
  return es;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  year: number | null;
  poster: string | null;
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdb<{
    results: { id: number; title: string; release_date: string; poster_path: string | null }[];
  }>("/search/movie", { query, language: "es-AR", include_adult: "false" });
  return data.results.slice(0, 12).map((r) => ({
    id: r.id,
    title: r.title,
    year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    poster: posterUrl(r.poster_path, "w185"),
  }));
}

export async function fetchTmdbCard(id: number) {
  const d = await tmdb<{
    id: number;
    title: string;
    release_date: string;
    poster_path: string | null;
  }>(`/movie/${id}`, { language: "es-AR" });
  return {
    tmdbId: d.id,
    title: d.title,
    year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
    poster: posterUrl(d.poster_path, "w342"),
  };
}
