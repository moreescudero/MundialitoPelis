"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createBracket, roundName, seedOrder } from "@/lib/bracket";
import { defaultSize, interleave, seedScore, shuffle, SIZES } from "@/lib/seed";
import { setupStore, type SeedMode } from "@/lib/storage";
import type { Entry, EntrySource, MatchCard } from "@/lib/types";
import { Poster, SourceBadge } from "./tile";

type Candidate = { slug: string; source: "a" | "b" | "both" };

/** ¿Esta película cuenta para el turno de `who`? Las que están en las dos listas sirven para cualquiera. */
const isFor = (source: EntrySource, who: "a" | "b") => source === who || source === "both";

export function Cuadro() {
  const state = useSyncExternalStore(setupStore.subscribe, setupStore.getSnapshot, setupStore.getServerSnapshot);
  const update = setupStore.update;

  const entries = state.entries;
  // con el cuadro vacío arrancamos en 16: alcanza para variedad sin que se haga eterno
  const size = state.size ?? (entries.length === 0 ? 16 : defaultSize(entries.length));
  const diff = size - entries.length; // >0 faltan, <0 sobran

  const nameA = state.a?.label ?? "Persona 1";
  const nameB = state.b?.label ?? "Persona 2";
  const sourceLabel = (s: EntrySource) =>
    s === "both" ? "Las dos" : s === "a" ? nameA : s === "b" ? nameB : "Manual";

  // ---- sugerencias: películas de una sola watchlist, alternando una de cada persona
  const [pending, setPending] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(new Set<string>());

  const queue = useMemo<Candidate[]>(() => {
    if (!state.a || !state.b) return [];
    const inA = new Set(state.a.films.map((f) => f.slug));
    const inB = new Set(state.b.films.map((f) => f.slug));
    const listA = shuffle(state.a.films, state.suggestSeed).map<Candidate>((f) => ({
      slug: f.slug,
      source: inB.has(f.slug) ? "both" : "a",
    }));
    // las que están en las dos listas ya entraron por la lista de A
    const listB = shuffle(state.b.films.filter((f) => !inA.has(f.slug)), state.suggestSeed + 1).map<Candidate>((f) => ({
      slug: f.slug,
      source: "b",
    }));
    return interleave(listA, listB);
  }, [state.a, state.b, state.suggestSeed]);

  const takenSlugs = () =>
    new Set([...entries.map((e) => e.slug), ...pending.map((e) => e.slug), ...state.dismissed, ...tried.current]);

  const hasCandidates = (who: "a" | "b") => {
    const taken = takenSlugs();
    return queue.some((c) => isFor(c.source, who) && !taken.has(c.slug));
  };

  /** Resuelve las próximas `count` sugerencias de la cola, o de `only` si se indica. */
  async function fetchMore(count: number, only?: "a" | "b"): Promise<Entry[]> {
    const taken = takenSlugs();
    const batch = queue.filter((c) => !taken.has(c.slug) && (!only || isFor(c.source, only))).slice(0, count);
    batch.forEach((c) => tried.current.add(c.slug));
    if (batch.length === 0) return [];

    const res = await fetch("/api/letterboxd/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slugs: batch.map((c) => c.slug) }),
    });
    if (!res.ok) throw new Error(`Error ${res.status} al buscar sugerencias.`);
    const { films } = (await res.json()) as { films: MatchCard[] };
    const knownTmdb = new Set(entries.map((e) => e.tmdbId));
    const sourceOf = new Map(batch.map((c) => [c.slug, c.source]));
    return films
      .filter((f) => !knownTmdb.has(f.tmdbId))
      .map((f) => ({ ...f, source: sourceOf.get(f.slug)! }));
  }

  async function loadSuggestions() {
    setBusy(true);
    setError(null);
    try {
      const more = await fetchMore(12);
      setPending((p) => [...p, ...more]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const addExtras = (added: Entry[]) => {
    const slugs = new Set(added.map((e) => e.slug));
    update((s) => ({ ...s, entries: [...s.entries, ...added], bracket: null }));
    setPending((p) => p.filter((e) => !slugs.has(e.slug)));
  };

  async function autoFill() {
    setBusy(true);
    setError(null);
    try {
      const need = diff;
      const pool = [...pending];
      const added: Entry[] = [];
      let countA = entries.filter((e) => isFor(e.source, "a")).length;
      let countB = entries.filter((e) => isFor(e.source, "b")).length;

      const take = (i: number) => {
        const [e] = pool.splice(i, 1);
        added.push(e);
        if (isFor(e.source, "a")) countA++;
        if (isFor(e.source, "b")) countB++;
      };

      // una de cada uno por turno; se pide más solo de quien le toca
      while (added.length < need) {
        const want: "a" | "b" = countA <= countB ? "a" : "b";
        const other = want === "a" ? "b" : "a";
        const i = pool.findIndex((e) => isFor(e.source, want));
        if (i >= 0) {
          take(i);
        } else if (hasCandidates(want)) {
          pool.push(...(await fetchMore(6, want)));
        } else {
          const j = pool.findIndex((e) => isFor(e.source, other));
          if (j >= 0) take(j);
          else if (hasCandidates(other)) pool.push(...(await fetchMore(6, other)));
          else break;
        }
      }
      // lo que sobró de lo buscado queda como sugerencia visible
      const leftover = pool.filter((e) => !pending.some((p) => p.slug === e.slug));
      addExtras(added);
      setPending((p) => [...p, ...leftover]);
      if (added.length < need) {
        setError(`Solo pude encontrar ${added.length} de ${need}. Buscá el resto a mano.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const dismiss = (slug: string) => {
    update((s) => ({ ...s, dismissed: [...s.dismissed, slug] }));
    setPending((p) => p.filter((e) => e.slug !== slug));
  };

  const shuffleSuggestions = () => {
    tried.current.clear();
    setPending([]);
    update((s) => ({ ...s, suggestSeed: Math.floor(Math.random() * 1e9), dismissed: [] }));
  };

  // ---- búsqueda manual
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchCard[]>([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error(`Error ${res.status} al buscar.`);
      const { results } = (await res.json()) as {
        results: { id: number; title: string; year: number | null; poster: string | null; rating: number | null; votes: number }[];
      };
      setResults(
        results.map((r) => ({
          slug: `tmdb-${r.id}`,
          tmdbId: r.id,
          title: r.title,
          year: r.year,
          poster: r.poster,
          rating: r.rating,
          votes: r.votes,
        })),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  const inCup = new Set(entries.map((e) => e.tmdbId));

  // ---- acciones sobre el cuadro
  const setSize = (n: number) => update((s) => ({ ...s, size: n, bracket: null }));

  const removeEntry = (e: Entry) =>
    update((s) => ({ ...s, entries: s.entries.filter((x) => x.slug !== e.slug), bracket: null }));

  const removeRandom = (n: number) => {
    const doomed = new Set(shuffle(entries).slice(0, n).map((e) => e.slug));
    update((s) => ({ ...s, entries: s.entries.filter((e) => !doomed.has(e.slug)), bracket: null }));
  };

  const setSeedMode = (m: SeedMode) => update((s) => ({ ...s, seedMode: m, bracket: null }));

  const draw = () => {
    let order: string[];
    if (state.seedMode === "seeded") {
      const ranked = [...entries].sort((x, y) => seedScore(y) - seedScore(x));
      order = seedOrder(size).map((seed) => ranked[seed - 1].slug);
    } else {
      order = shuffle(entries).map((e) => e.slug);
    }
    update((s) => ({ ...s, bracket: createBracket(order) }));
  };

  const bySlug = useMemo(() => new Map(entries.map((e) => [e.slug, e])), [entries]);
  const ranks = useMemo(
    () => new Map([...entries].sort((x, y) => seedScore(y) - seedScore(x)).map((e, i) => [e.slug, i + 1])),
    [entries],
  );

  if (!state.a || !state.b) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Armar el cuadro</h1>
        <p className="opacity-70">Primero hay que cargar las dos watchlists.</p>
        <Link href="/" className="self-start underline">← Volver al inicio</Link>
      </div>
    );
  }

  const ready = diff === 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm underline opacity-70">← Watchlists</Link>
        <h1 className="text-3xl font-bold">Armar el cuadro</h1>
      </header>

      {/* tamaño */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">¿De cuántas películas es el mundial?</h2>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((n) => (
            <button
              key={n}
              onClick={() => setSize(n)}
              className={`rounded-lg border px-4 py-2 font-medium ${
                n === size ? "border-foreground bg-foreground text-background" : "border-foreground/25"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className={ready ? "text-green-600 dark:text-green-400" : ""}>
          {ready && <>✓ Tienen las {size} películas. Listo para sortear.</>}
          {diff > 0 && <>Tienen {entries.length} de {size}: <b>faltan {diff}</b>.</>}
          {diff < 0 && <>Tienen {entries.length} y entran {size}: <b>sobran {-diff}</b>.</>}
        </p>
      </section>

      {/* faltan */}
      {diff > 0 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-foreground/15 p-5">
          <h2 className="text-lg font-semibold">{entries.length === 0 ? `Armar el mundial: ${diff} películas` : `Completar con ${diff} más`}</h2>
          <p className="text-sm opacity-70">
            Salen de las dos watchlists, mezcladas: una de {nameA} y una de {nameB} por turno. No hace falta que coincidan.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={autoFill}
              disabled={busy}
              className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
            >
              {busy ? "Buscando…" : `Completar automáticamente (${diff})`}
            </button>
            <button
              onClick={loadSuggestions}
              disabled={busy}
              className="rounded-lg border border-foreground/25 px-4 py-2 disabled:opacity-50"
            >
              {pending.length ? "Ver más sugerencias" : "Elegir yo entre sugerencias"}
            </button>
            {(pending.length > 0 || state.dismissed.length > 0) && (
              <button onClick={shuffleSuggestions} className="px-2 text-sm underline opacity-70">
                Mezclar
              </button>
            )}
          </div>

          {pending.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {pending.map((m) => (
                <li key={m.slug} className="flex flex-col gap-1">
                  <button
                    onClick={() => addExtras([m])}
                    title={`Sumar ${m.title} (${m.year ?? "s/f"})`}
                    className="relative block overflow-hidden rounded-lg transition hover:scale-[1.03]"
                  >
                    <Poster movie={m} />
                    <SourceBadge label={sourceLabel(m.source)} />
                  </button>
                  <button onClick={() => dismiss(m.slug)} className="text-xs underline opacity-60">
                    no, gracias
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-foreground/15 pt-4">
            <h3 className="font-medium">O buscar una película</h3>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Título"
                className="min-w-0 flex-1 rounded-lg border border-foreground/20 bg-transparent px-3 py-2"
              />
              <button
                onClick={search}
                disabled={searching}
                className="rounded-lg border border-foreground/25 px-4 py-2 disabled:opacity-50"
              >
                {searching ? "Buscando…" : "Buscar"}
              </button>
            </div>
            {results.length > 0 && (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                {results.map((m) => {
                  const already = inCup.has(m.tmdbId);
                  return (
                    <li key={m.slug}>
                      <button
                        disabled={already}
                        onClick={() => addExtras([{ ...m, source: "manual" }])}
                        title={`${m.title} (${m.year ?? "s/f"})`}
                        className={`block w-full overflow-hidden rounded-lg transition ${already ? "opacity-30" : "hover:scale-[1.03]"}`}
                      >
                        <Poster movie={m} />
                      </button>
                      <p className="mt-1 text-xs opacity-70">{m.title} {m.year && `(${m.year})`}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>
      )}

      {/* sobran */}
      {diff < 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-foreground/15 p-5">
          <h2 className="text-lg font-semibold">Sacar {-diff}</h2>
          <p className="text-sm opacity-70">
            Toquen las que quieran sacar en la lista de abajo, o elijan un tamaño más grande.
          </p>
          <button
            onClick={() => removeRandom(-diff)}
            className="self-start rounded-lg border border-foreground/25 px-4 py-2"
          >
            Sacar {-diff} al azar
          </button>
        </section>
      )}

      {/* las que están */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">En el mundial ({entries.length})</h2>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {entries.map((e) => (
            <li key={e.slug}>
              <button
                onClick={() => removeEntry(e)}
                title={`Sacar ${e.title} (${e.year ?? "s/f"})`}
                className="relative block w-full overflow-hidden rounded-lg transition hover:opacity-50"
              >
                <Poster movie={e} />
                <SourceBadge label={sourceLabel(e.source)} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* sorteo */}
      {ready && (
        <section className="flex flex-col gap-4 rounded-2xl border border-foreground/15 p-5">
          <h2 className="text-lg font-semibold">Sorteo</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["random", "Al azar"],
                ["seeded", "Cabezas de serie (las mejor puntuadas no se cruzan hasta el final)"],
              ] as const
            ).map(([mode, text]) => (
              <button
                key={mode}
                onClick={() => setSeedMode(mode)}
                className={`rounded-lg border px-4 py-2 text-left ${
                  state.seedMode === mode ? "border-foreground bg-foreground text-background" : "border-foreground/25"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
          <button
            onClick={draw}
            className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background"
          >
            {state.bracket ? "🎲 Sortear de nuevo" : "🎲 Sortear"}
          </button>
          {state.bracket && (
            <Link
              href="/mundial"
              className="self-start rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white"
            >
              ▶ Empezar el mundial
            </Link>
          )}

          {state.bracket && (
            <div className="flex flex-col gap-3">
              <h3 className="font-medium">{roundName(state.bracket, 0)}</h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {state.bracket.rounds[0].map((m, i) => {
                  const pair = [m.a, m.b].map((s) => (s ? bySlug.get(s) : undefined));
                  return (
                    <li key={i} className="flex items-center gap-3 rounded-xl border border-foreground/15 p-2">
                      {pair.map((p, k) => (
                        <div key={k} className="flex flex-1 items-center gap-2">
                          {k === 1 && <span className="text-xs font-bold opacity-50">VS</span>}
                          {p && (
                            <>
                              <div className="w-10 shrink-0">
                                <Poster movie={p} className="rounded" />
                              </div>
                              <span className="text-sm leading-tight">
                                {p.title}
                                {state.seedMode === "seeded" && (
                                  <span className="ml-1 text-xs opacity-50">#{ranks.get(p.slug)}</span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
