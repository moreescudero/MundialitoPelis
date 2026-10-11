import { getMovie } from "@/lib/movie";

export async function GET(_req: Request, ctx: RouteContext<"/api/movie/[id]">) {
  const { id } = await ctx.params;
  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  try {
    return Response.json(await getMovie(tmdbId));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
