import { searchTmdb } from "@/lib/tmdb";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });
  try {
    return Response.json({ results: await searchTmdb(q.slice(0, 100)) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
