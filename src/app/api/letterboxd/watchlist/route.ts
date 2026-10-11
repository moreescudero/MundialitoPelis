import { fetchWatchlist, LetterboxdError } from "@/lib/letterboxd";

export async function GET(req: Request) {
  const user = new URL(req.url).searchParams.get("user")?.trim().replace(/^@/, "") ?? "";
  try {
    return Response.json({ films: await fetchWatchlist(user) });
  } catch (e) {
    const status = e instanceof LetterboxdError ? e.status : 502;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
