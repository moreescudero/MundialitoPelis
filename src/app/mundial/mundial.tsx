"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { champion, nextMatch, pickWinner, progress, roundName, undoLast } from "@/lib/bracket";
import { getEntries, setupStore } from "@/lib/storage";
import { Poster } from "../cuadro/tile";
import { Ficha, FichaSkeleton, loadMovie } from "./ficha";
import { Llave } from "./llave";

export function Mundial() {
  const state = useSyncExternalStore(setupStore.subscribe, setupStore.getSnapshot, setupStore.getServerSnapshot);
  const [showBracket, setShowBracket] = useState(false);
  const bracket = state.bracket;
  const bySlug = useMemo(() => new Map(getEntries(state).map((e) => [e.slug, e])), [state]);

  if (!bracket) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Mundial de Películas</h1>
        <p className="opacity-70">Todavía no hay un cuadro sorteado.</p>
        <Link href="/cuadro" className="self-start underline">← Armar el cuadro</Link>
      </div>
    );
  }

  const next = nextMatch(bracket);
  const winnerSlug = champion(bracket);
  const { played, total } = progress(bracket);
  const update = setupStore.update;

  const vote = (slug: string) => {
    if (!next) return;
    const after = pickWinner(bracket, next.round, next.index, slug);
    update((s) => ({ ...s, bracket: after }));
    // precarga el próximo enfrentamiento para que aparezca sin espera
    const upcoming = nextMatch(after);
    if (upcoming) {
      const um = after.rounds[upcoming.round][upcoming.index];
      for (const sl of [um.a, um.b]) {
        const e = sl ? bySlug.get(sl) : undefined;
        if (e) loadMovie(e.tmdbId);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const undo = () => update((s) => ({ ...s, bracket: undoLast(s.bracket!) }));
  const restart = () => update((s) => ({ ...s, bracket: null }));

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link href="/cuadro" className="text-sm underline opacity-70">← Cuadro</Link>
        <h1 className="text-2xl font-bold">
          🏆 {next ? roundName(bracket, next.round) : "Mundial terminado"}
          {next && (
            <span className="ml-2 text-base font-normal opacity-60">
              partido {next.index + 1} de {bracket.rounds[next.round].length}
            </span>
          )}
        </h1>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="opacity-60">{played}/{total} jugados</span>
        <button onClick={undo} disabled={played === 0} className="rounded-lg border border-foreground/25 px-3 py-1.5 disabled:opacity-30">
          ↩ Deshacer
        </button>
        <button onClick={() => setShowBracket((v) => !v)} className="rounded-lg border border-foreground/25 px-3 py-1.5">
          {showBracket ? "Ocultar cuadro" : "Ver cuadro"}
        </button>
      </div>
    </header>
  );

  const llave = showBracket && (
    <Llave bracket={bracket} bySlug={bySlug} current={next ? [next.round, next.index] : null} />
  );

  // ---- campeona
  if (winnerSlug) {
    const champ = bySlug.get(winnerSlug);
    const path = bracket.rounds.flatMap((round, r) =>
      round
        .filter((m) => m.winner === winnerSlug)
        .map((m) => {
          const rival = bySlug.get((m.a === winnerSlug ? m.b : m.a) ?? "");
          return { round: roundName(bracket, r), rival: rival?.title ?? "?" };
        }),
    );
    const lbUrl = winnerSlug.startsWith("tmdb-") ? null : `https://letterboxd.com/film/${winnerSlug}/`;

    return (
      <div className="flex flex-col gap-6">
        {header}
        {llave}
        <section className="flex flex-col items-center gap-5 py-6 text-center">
          <p className="text-5xl">🏆</p>
          <h2 className="text-3xl font-extrabold sm:text-5xl">¡{champ?.title} es la campeona!</h2>
          {champ && <div className="w-56 sm:w-72"><Poster movie={champ} className="rounded-xl shadow-2xl" /></div>}
          <ul className="flex flex-col gap-1 text-sm opacity-80">
            {path.map((p) => (
              <li key={p.round}>{p.round}: le ganó a <b>{p.rival}</b></li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-3">
            {lbUrl && (
              <a href={lbUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background">
                Verla en Letterboxd
              </a>
            )}
            <Link href="/cuadro" onClick={restart} className="rounded-lg border border-foreground/25 px-5 py-2.5">
              Armar otro mundial
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ---- versus
  const m = next ? bracket.rounds[next.round][next.index] : null;
  const a = m?.a ? bySlug.get(m.a) : undefined;
  const b = m?.b ? bySlug.get(m.b) : undefined;
  if (!a || !b) {
    return <p>No encontré las películas de este partido. <Link href="/cuadro" className="underline">Volvé al cuadro</Link>.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {llave}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Suspense fallback={<FichaSkeleton />}>
          <Ficha key={a.slug} entry={a} onPick={() => vote(a.slug)} />
        </Suspense>
        <div className="flex items-center justify-center text-4xl font-black opacity-40">VS</div>
        <Suspense fallback={<FichaSkeleton />}>
          <Ficha key={b.slug} entry={b} onPick={() => vote(b.slug)} />
        </Suspense>
      </div>
    </div>
  );
}
