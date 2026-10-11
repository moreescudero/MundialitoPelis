import { cacheLife } from "next/cache";
import { fetchOmdb, translateAwards } from "./omdb";
import { backdropUrl, fetchTmdbMovie, photoUrl, posterUrl } from "./tmdb";
import { buildTrivia } from "./trivia";
import type { Movie } from "./types";

/** Ficha completa de una película (TMDB + OMDb), cacheada. */
export async function getMovie(tmdbId: number): Promise<Movie> {
  "use cache";
  cacheLife("days");

  const t = await fetchTmdbMovie(tmdbId);
  const imdbId = t.external_ids?.imdb_id || null;
  const o = imdbId
    ? await fetchOmdb(imdbId)
    : { imdb: null, rottenTomatoes: null, metacritic: null, awards: null };

  return {
    tmdbId: t.id,
    imdbId,
    title: t.title,
    originalTitle: t.original_title,
    year: t.release_date ? Number(t.release_date.slice(0, 4)) : null,
    releaseDate: t.release_date || null,
    poster: posterUrl(t.poster_path),
    backdrop: backdropUrl(t.backdrop_path),
    directors: t.credits.crew.filter((c) => c.job === "Director").map((c) => c.name),
    cast: t.credits.cast
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((c) => ({ name: c.name, character: c.character, photo: photoUrl(c.profile_path) })),
    overview: t.overview,
    tagline: t.tagline || null,
    genres: t.genres.map((g) => g.name),
    runtime: t.runtime,
    ratings: {
      imdb: o.imdb,
      rottenTomatoes: o.rottenTomatoes,
      metacritic: o.metacritic,
      tmdb: t.vote_average ? Math.round(t.vote_average * 10) / 10 : null,
    },
    awards: translateAwards(o.awards),
    trivia: buildTrivia(t, o),
  };
}
