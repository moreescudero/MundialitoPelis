import { pool, resolveSlug } from "@/lib/letterboxd";
import type { MatchCard } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const slugs: unknown = body?.slugs;
  if (!Array.isArray(slugs) || slugs.length > 300 || slugs.some((s) => typeof s !== "string")) {
    return Response.json({ error: "slugs inválidos" }, { status: 400 });
  }
  const cards = await pool(slugs as string[], 8, resolveSlug);
  const films = cards.filter((c): c is MatchCard => c !== null);
  const failed = (slugs as string[]).filter((_, i) => cards[i] === null);
  return Response.json({ films, failed });
}
