import { LetterboxdError, parseCsv, pool, slugFromUri } from "@/lib/letterboxd";
import type { LbFilm } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const rows = parseCsv(await req.text());
    if (rows.length === 0) throw new LetterboxdError("El CSV no tiene películas.", 400);
    if (rows.length > 1500) throw new LetterboxdError("El CSV es demasiado grande (máximo 1500).", 400);
    const slugs = await pool(rows, 10, (r) => slugFromUri(r.uri));
    const films: LbFilm[] = [];
    rows.forEach((r, i) => {
      if (slugs[i]) films.push({ slug: slugs[i]!, name: r.name, year: r.year });
    });
    return Response.json({ films });
  } catch (e) {
    const status = e instanceof LetterboxdError ? e.status : 500;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
