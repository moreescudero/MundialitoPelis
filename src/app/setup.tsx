"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { PersonPanel } from "./person-panel";
import { setupStore, type PersonList } from "@/lib/storage";

export function Setup() {
  const state = useSyncExternalStore(setupStore.subscribe, setupStore.getSnapshot, setupStore.getServerSnapshot);

  const shared = useMemo(() => {
    if (!state.a || !state.b) return 0;
    const inB = new Set(state.b.films.map((f) => f.slug));
    return state.a.films.filter((f) => inB.has(f.slug)).length;
  }, [state.a, state.b]);

  // al cambiar una lista, lo armado antes deja de valer
  const setPerson = (key: "a" | "b") => (list: PersonList | null) =>
    setupStore.update((s) => ({ ...s, [key]: list, entries: [], dismissed: [], size: null, bracket: null }));

  const nameA = state.a?.label ?? "Persona 1";
  const nameB = state.b?.label ?? "Persona 2";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonPanel title="Persona 1" value={state.a} onChange={setPerson("a")} />
        <PersonPanel title="Persona 2" value={state.b} onChange={setPerson("b")} />
      </div>

      {state.a && state.b && (
        <div className="flex flex-col gap-3">
          <p className="opacity-80">
            El mundial se arma con películas de las dos watchlists, mezcladas: una de {nameA} y una de {nameB}{" "}
            por turno. No hace falta que coincidan{shared > 0 && <> (igual hay {shared} que están en las dos y pueden aparecer)</>}.
          </p>
          <Link
            href="/cuadro"
            className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background"
          >
            Armar el cuadro →
          </Link>
        </div>
      )}
    </div>
  );
}
