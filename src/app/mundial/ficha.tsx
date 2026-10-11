"use client";

import Image from "next/image";
import { use } from "react";
import type { Entry, Movie } from "@/lib/types";
import { Poster } from "../cuadro/tile";

const cache = new Map<number, Promise<Movie | null>>();

/** Pide la ficha completa una sola vez por película; si falla devuelve null. */
export function loadMovie(tmdbId: number): Promise<Movie | null> {
  let p = cache.get(tmdbId);
  if (!p) {
    p = fetch(`/api/movie/${tmdbId}`)
      .then((r) => (r.ok ? (r.json() as Promise<Movie>) : null))
      .catch(() => null);
    cache.set(tmdbId, p);
  }
  return p;
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : "s/f";

export function Ficha({ entry, onPick, picked }: { entry: Entry; onPick: () => void; picked?: boolean }) {
  const m = use(loadMovie(entry.tmdbId));

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-4 ${
        picked ? "border-green-500 ring-2 ring-green-500" : "border-foreground/15"
      }`}
    >
      <div className="flex gap-4">
        <div className="w-32 shrink-0 sm:w-40">
          <Poster movie={entry} className="rounded-lg" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="text-2xl font-bold leading-tight">{entry.title}</h2>
          {m?.originalTitle && m.originalTitle !== entry.title && (
            <p className="text-sm opacity-60">{m.originalTitle}</p>
          )}
          {m?.tagline && <p className="text-sm italic opacity-70">«{m.tagline}»</p>}
          <dl className="mt-1 flex flex-col gap-1 text-sm">
            <div><dt className="inline font-semibold">Estreno: </dt><dd className="inline">{m ? fmtDate(m.releaseDate) : entry.year}</dd></div>
            {m && m.directors.length > 0 && (
              <div><dt className="inline font-semibold">Dirección: </dt><dd className="inline">{m.directors.join(", ")}</dd></div>
            )}
            {m && (
              <div className="opacity-70">
                {[m.runtime ? `${m.runtime} min` : null, m.genres.join(", ")].filter(Boolean).join(" · ")}
              </div>
            )}
          </dl>
          {m && (
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
              {m.ratings.imdb && <span>⭐ IMDb <b>{m.ratings.imdb}</b></span>}
              {m.ratings.rottenTomatoes && <span>🍅 <b>{m.ratings.rottenTomatoes}</b></span>}
              {m.ratings.metacritic && <span>Metacritic <b>{m.ratings.metacritic}</b></span>}
            </p>
          )}
        </div>
      </div>

      {!m && <p className="text-sm opacity-60">No pude cargar el detalle de esta película, pero igual pueden votarla.</p>}

      {m && (
        <>
          {m.cast.length > 0 && (
            <ul className="flex gap-3 overflow-x-auto pb-1">
              {m.cast.map((c) => (
                <li key={c.name} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                  {c.photo ? (
                    <Image src={c.photo} alt={c.name} width={64} height={64} className="size-14 rounded-full object-cover" />
                  ) : (
                    <span className="size-14 rounded-full bg-foreground/10" />
                  )}
                  <span className="text-[11px] leading-tight">{c.name}</span>
                </li>
              ))}
            </ul>
          )}

          {m.overview && <p className="text-sm leading-relaxed">{m.overview}</p>}

          {m.awards && (
            <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm">🏆 {m.awards}</p>
          )}
          {m.trivia.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm opacity-90">
              {m.trivia.map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
        </>
      )}

      <button
        onClick={onPick}
        className="mt-auto rounded-xl bg-foreground px-4 py-3 text-lg font-bold text-background transition hover:scale-[1.02]"
      >
        Pasa esta ✓
      </button>
    </article>
  );
}

export function FichaSkeleton() {
  return <div className="h-[34rem] animate-pulse rounded-2xl border border-foreground/15 bg-foreground/5" />;
}
