import { cacheLife } from "next/cache";
import { fetchTmdbCard } from "./tmdb";
import type { LbFilm, MatchCard } from "./types";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

export class LetterboxdError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Corre `fn` sobre cada item con un máximo de `limit` tareas en paralelo. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export function parseWatchlistPage(html: string): LbFilm[] {
  const films: LbFilm[] = [];
  for (const tag of html.matchAll(/<div[^>]*\bdata-item-slug="([^"]+)"[^>]*>/g)) {
    const nameAttr = tag[0].match(/data-item-full-display-name="([^"]*)"/)?.[1] ?? "";
    const full = decode(nameAttr);
    const year = full.match(/\s\((\d{4})\)$/)?.[1];
    films.push({
      slug: tag[1],
      name: full.replace(/\s\(\d{4}\)$/, ""),
      year: year ? Number(year) : null,
    });
  }
  return films;
}

async function getPage(user: string, page: number): Promise<string> {
  const res = await fetch(`https://letterboxd.com/${user}/watchlist/page/${page}/`, { headers: HEADERS });
  if (res.status === 404) {
    throw new LetterboxdError(`No encontré el usuario «${user}» en Letterboxd.`, 404);
  }
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    throw new LetterboxdError(
      "Letterboxd bloqueó la consulta. Probá de nuevo en unos minutos o subí el CSV de la watchlist.",
      502,
    );
  }
  if (!res.ok) throw new LetterboxdError(`Letterboxd respondió ${res.status}.`);
  return res.text();
}

/** Watchlist pública completa de un usuario. */
export async function fetchWatchlist(user: string): Promise<LbFilm[]> {
  if (!/^[A-Za-z0-9_]{2,15}$/.test(user)) {
    throw new LetterboxdError("Ese nombre de usuario no es válido.", 400);
  }
  const first = await getPage(user, 1);
  const pages = [...first.matchAll(/watchlist\/page\/(\d+)\//g)].map((m) => Number(m[1]));
  const last = Math.min(Math.max(1, ...pages), 60);

  const rest = await pool(
    Array.from({ length: last - 1 }, (_, i) => i + 2),
    4,
    (n) => getPage(user, n),
  );
  const films = [first, ...rest].flatMap(parseWatchlistPage);
  if (films.length === 0) {
    throw new LetterboxdError(
      `La watchlist de «${user}» está vacía o es privada. Subí el CSV si preferís no hacerla pública.`,
      404,
    );
  }
  // sin duplicados, conservando el orden
  return [...new Map(films.map((f) => [f.slug, f])).values()];
}

/** Lee el watchlist.csv exportado por Letterboxd: Date,Name,Year,Letterboxd URI */
export function parseCsv(text: string): { name: string; year: number | null; uri: string }[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((v) => v)) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v)) rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];
  const col = (n: string) => header.findIndex((h) => h.trim().toLowerCase() === n);
  const [iName, iYear, iUri] = [col("name"), col("year"), col("letterboxd uri")];
  if (iName < 0 || iUri < 0) throw new LetterboxdError("Ese archivo no parece un watchlist.csv de Letterboxd.", 400);
  return body
    .filter((r) => r[iUri])
    .map((r) => ({ name: r[iName], year: Number(r[iYear]) || null, uri: r[iUri].trim() }));
}

/** Un link corto boxd.it redirige a la página de la película, de ahí sale el slug. */
export async function slugFromUri(uri: string): Promise<string | null> {
  const direct = uri.match(/letterboxd\.com\/film\/([^/]+)/)?.[1];
  if (direct) return direct;
  if (!/^https:\/\/boxd\.it\/[A-Za-z0-9]+$/.test(uri)) return null;
  try {
    const res = await fetch(uri, { headers: HEADERS, redirect: "manual" });
    return res.headers.get("location")?.match(/\/film\/([^/]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Slug de Letterboxd → tarjeta de TMDB (la página de la película trae el id de TMDB). */
export async function resolveSlug(slug: string): Promise<MatchCard | null> {
  "use cache";
  cacheLife("days");

  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const res = await fetch(`https://letterboxd.com/film/${slug}/`, { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const id = html.match(/data-tmdb-id="(\d+)"/)?.[1];
    const type = html.match(/data-tmdb-type="([^"]+)"/)?.[1];
    if (!id || (type && type !== "movie")) return null;
    return { slug, ...(await fetchTmdbCard(Number(id))) };
  } catch {
    return null;
  }
}
