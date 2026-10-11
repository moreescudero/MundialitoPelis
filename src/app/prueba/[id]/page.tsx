import Image from "next/image";
import { Suspense } from "react";
import { getMovie } from "@/lib/movie";

async function Ficha({ params }: PageProps<"/prueba/[id]">) {
  const { id } = await params;
  const m = await getMovie(Number(id));

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:flex-row">
      {m.poster && (
        <Image src={m.poster} alt={m.title} width={300} height={450} className="h-auto w-64 rounded-lg" priority />
      )}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">
          {m.title} <span className="font-normal opacity-60">({m.year})</span>
        </h1>
        {m.tagline && <p className="italic opacity-70">{m.tagline}</p>}
        <p className="text-sm opacity-70">
          {m.releaseDate} · {m.runtime} min · {m.genres.join(", ")}
        </p>
        <p><b>Dirección:</b> {m.directors.join(", ")}</p>
        <p><b>Cast:</b> {m.cast.map((c) => c.name).join(", ")}</p>
        <p>{m.overview}</p>
        <p className="text-sm">
          <b>IMDb</b> {m.ratings.imdb ?? "–"} · <b>RT</b> {m.ratings.rottenTomatoes ?? "–"} ·{" "}
          <b>Metacritic</b> {m.ratings.metacritic ?? "–"}
        </p>
        {m.awards && <p><b>Premios:</b> {m.awards}</p>}
        {m.trivia.length > 0 && (
          <ul className="list-disc pl-5">
            {m.trivia.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
      </div>
    </article>
  );
}

export default function Page(props: PageProps<"/prueba/[id]">) {
  return (
    <Suspense fallback={<p className="p-6">Cargando…</p>}>
      <Ficha {...props} />
    </Suspense>
  );
}
