"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { PersonPanel } from "./person-panel";
import { setupStore, type PersonList } from "@/lib/storage";
import type { MatchCard } from "@/lib/types";

const CHUNK = 60;

export function Setup() {
  const state = useSyncExternalStore(
    setupStore.subscribe,
    setupStore.getSnapshot,
    setupStore.getServerSnapshot,
  );
  const setState = setupStore.update;
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const commonSlugs = useMemo(() => {
    if (!state.a || !state.b) return [];
    const inB = new Set(state.b.films.map((f) => f.slug));
    return state.a.films.filter((f) => inB.has(f.slug)).map((f) => f.slug);
  }, [state.a, state.b]);

  const setPerson = (key: "a" | "b") => (list: PersonList | null) =>
    // al cambiar una lista, las coincidencias anteriores dejan de valer
    setState((s) => ({ ...s, [key]: list, matches: [], removed: [] }));

  async function findMatches() {
    setError(null);
    setUnresolved([]);
    const cards: MatchCard[] = [];
    const failed: string[] = [];
    setProgress({ done: 0, total: commonSlugs.length });
    try {
      for (let i = 0; i < commonSlugs.length; i += CHUNK) {
        const res = await fetch("/api/letterboxd/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slugs: commonSlugs.slice(i, i + CHUNK) }),
        });
        if (!res.ok) throw new Error(`Error ${res.status} al buscar las películas.`);
        const data = (await res.json()) as { films: MatchCard[]; failed: string[] };
        cards.push(...data.films);
        failed.push(...data.failed);
        setProgress({ done: Math.min(i + CHUNK, commonSlugs.length), total: commonSlugs.length });
      }
      setState((s) => ({ ...s, matches: cards, removed: [] }));
      setUnresolved(failed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const removed = new Set(state.removed);
  const active = state.matches.filter((m) => !removed.has(m.slug));
  const toggle = (slug: string) =>
    setState((s) => ({
      ...s,
      removed: s.removed.includes(slug) ? s.removed.filter((r) => r !== slug) : [...s.removed, slug],
    }));

  const bothLoaded = state.a && state.b;
  const nameA = state.a?.label ?? "A";
  const nameB = state.b?.label ?? "B";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonPanel title="Persona 1" value={state.a} onChange={setPerson("a")} />
        <PersonPanel title="Persona 2" value={state.b} onChange={setPerson("b")} />
      </div>

      {bothLoaded && (
        <div className="flex flex-col gap-3">
          <p>
            <b>{commonSlugs.length}</b> películas están en la watchlist de los dos.
          </p>
          {commonSlugs.length === 0 ? (
            <p className="opacity-70">
              No coinciden en ninguna. Igual se puede armar el mundial sumando películas sueltas en el siguiente paso.
            </p>
          ) : (
            state.matches.length === 0 && (
              <button
                onClick={findMatches}
                disabled={!!progress}
                className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
              >
                {progress ? `Buscando… ${progress.done}/${progress.total}` : "Ver coincidencias"}
              </button>
            )
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {state.matches.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="opacity-80">
            {active.length} seleccionadas de {state.matches.length}. Tocá una para sacarla.
          </p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {state.matches.map((m) => (
              <li key={m.slug}>
                <button
                  onClick={() => toggle(m.slug)}
                  title={`${m.title} (${m.year ?? "s/f"})`}
                  className={`relative block w-full overflow-hidden rounded-lg transition ${
                    removed.has(m.slug) ? "opacity-25 grayscale" : "hover:scale-[1.03]"
                  }`}
                >
                  {m.poster ? (
                    <Image src={m.poster} alt={m.title} width={342} height={513} className="h-auto w-full" />
                  ) : (
                    <span className="flex aspect-[2/3] items-center justify-center bg-foreground/10 p-2 text-center text-sm">
                      {m.title}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {unresolved.length > 0 && (
            <p className="text-sm opacity-60">
              {unresolved.length} no se pudieron identificar y quedaron afuera.
            </p>
          )}
          <p className="text-sm opacity-60">
            Solo de {nameA}: {(state.a?.films.length ?? 0) - commonSlugs.length} · Solo de {nameB}:{" "}
            {(state.b?.films.length ?? 0) - commonSlugs.length}
          </p>
        </div>
      )}
    </div>
  );
}
