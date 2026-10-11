export interface OmdbData {
  imdb: string | null;
  rottenTomatoes: string | null;
  metacritic: string | null;
  awards: string | null;
}

const clean = (v: unknown): string | null =>
  typeof v === "string" && v !== "N/A" && v.trim() !== "" ? v : null;

export async function fetchOmdb(imdbId: string): Promise<OmdbData> {
  const empty: OmdbData = { imdb: null, rottenTomatoes: null, metacritic: null, awards: null };
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${process.env.OMDB_API_KEY}`,
    );
    if (!res.ok) return empty;
    const d = await res.json();
    if (d.Response !== "True") return empty;
    const rt = (d.Ratings ?? []).find((r: { Source: string }) => r.Source === "Rotten Tomatoes");
    return {
      imdb: clean(d.imdbRating),
      rottenTomatoes: clean(rt?.Value),
      metacritic: clean(d.Metascore) ? `${d.Metascore}/100` : null,
      awards: clean(d.Awards),
    };
  } catch {
    // OMDb es complementario: si falla, la ficha sigue funcionando sin premios
    return empty;
  }
}

/** Traduce el texto de OMDb ("Won 3 Oscars. 20 wins & 40 nominations total") a español. */
export function translateAwards(awards: string | null): string | null {
  if (!awards) return null;
  return awards
    .replace(/Nominated for (\d+) Oscars?/i, (_, n) => `Nominada a ${n} ${n === "1" ? "premio" : "premios"} Oscar`)
    .replace(/Won (\d+) Oscars?/i, (_, n) => `Ganó ${n} ${n === "1" ? "premio" : "premios"} Oscar`)
    .replace(/Nominated for (\d+) (Primetime Emmys?|Golden Globes?|BAFTA Awards?)/i, (_, n, p) => `Nominada a ${n} ${p}`)
    .replace(/Won (\d+) (Primetime Emmys?|Golden Globes?|BAFTA Awards?)/i, (_, n, p) => `Ganó ${n} ${p}`)
    .replace(/(\d+) wins?/gi, (_, n) => `${n} premio${n === "1" ? "" : "s"}`)
    .replace(/(\d+) nominations?/gi, (_, n) => `${n} ${n === "1" ? "nominación" : "nominaciones"}`)
    .replace(/ & /g, " y ")
    .replace(/\btotal\b/gi, "en total")
    .replace(/\.\s*$/, "");
}
