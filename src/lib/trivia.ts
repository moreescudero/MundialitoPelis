import type { TmdbMovieRaw } from "./tmdb";
import type { OmdbData } from "./omdb";

const money = (n: number) =>
  n >= 1e9
    ? `US$ ${(n / 1e9).toFixed(1)} mil millones`
    : `US$ ${Math.round(n / 1e6)} millones`;

const LANG: Record<string, string> = {
  en: "inglés", es: "español", fr: "francés", ja: "japonés", ko: "coreano", it: "italiano",
  de: "alemán", pt: "portugués", zh: "chino", hi: "hindi", sv: "sueco", da: "danés", ru: "ruso",
};

/** Datos curiosos armados solo con datos reales (sin IA). */
export function buildTrivia(t: TmdbMovieRaw, o: OmdbData): string[] {
  const out: string[] = [];

  if (t.budget >= 1e6 && t.revenue >= 1e6) {
    const ratio = t.revenue / t.budget;
    if (ratio >= 3) {
      out.push(
        `Costó ${money(t.budget)} y recaudó ${money(t.revenue)}: multiplicó su presupuesto por ${ratio.toFixed(1).replace(/\.0$/, "")}.`,
      );
    } else if (ratio < 1) {
      out.push(`Fue un fracaso de taquilla: costó ${money(t.budget)} y recaudó ${money(t.revenue)}.`);
    } else {
      out.push(`Costó ${money(t.budget)} y recaudó ${money(t.revenue)}.`);
    }
  } else if (t.revenue >= 1e8) {
    out.push(`Recaudó ${money(t.revenue)} en cines.`);
  }

  if (o.rottenTomatoes) out.push(`Tiene ${o.rottenTomatoes} de aprobación en Rotten Tomatoes.`);
  if (o.metacritic) out.push(`Metacritic le da ${o.metacritic}.`);

  const kw = t.keywords?.keywords.map((k) => k.name.toLowerCase()) ?? [];
  if (kw.some((k) => k.startsWith("based on novel") || k === "based on novel or book")) {
    out.push("Está basada en una novela.");
  } else if (kw.includes("based on true story")) {
    out.push("Está basada en hechos reales.");
  } else if (kw.includes("based on comic")) {
    out.push("Está basada en un cómic.");
  }

  if (t.belongs_to_collection) {
    const saga = t.belongs_to_collection.name.replace(/\s*[-–]?\s*(Colección|Collection)$/i, "");
    out.push(`Es parte de la saga «${saga}».`);
  }

  if (t.original_language !== "en" && LANG[t.original_language]) {
    const iso = t.production_countries[0]?.iso_3166_1;
    const country = iso ? new Intl.DisplayNames(["es"], { type: "region" }).of(iso) : null;
    out.push(`Es una película hablada en ${LANG[t.original_language]}${country ? ` (${country})` : ""}.`);
  }

  return out;
}
