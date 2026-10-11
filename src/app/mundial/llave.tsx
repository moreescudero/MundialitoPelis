import { roundName, type Bracket } from "@/lib/bracket";
import type { Entry } from "@/lib/types";

/** Cuadro completo: una columna por ronda. */
export function Llave({ bracket, bySlug, current }: { bracket: Bracket; bySlug: Map<string, Entry>; current: [number, number] | null }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-3">
      {bracket.rounds.map((round, r) => (
        <div key={r} className="flex min-w-48 flex-col">
          <h3 className="mb-2 text-sm font-semibold opacity-70">{roundName(bracket, r)}</h3>
          <div className="flex flex-1 flex-col justify-around gap-2">
            {round.map((m, i) => {
              const isCurrent = current?.[0] === r && current[1] === i;
              return (
                <div
                  key={i}
                  className={`flex flex-col overflow-hidden rounded-lg border text-xs ${
                    isCurrent ? "border-green-500 ring-1 ring-green-500" : "border-foreground/20"
                  }`}
                >
                  {([m.a, m.b] as const).map((slug, k) => {
                    const e = slug ? bySlug.get(slug) : undefined;
                    const won = !!slug && m.winner === slug;
                    const lost = !!m.winner && !won;
                    return (
                      <div
                        key={k}
                        className={`truncate px-2 py-1 ${k === 0 ? "border-b border-foreground/10" : ""} ${
                          won ? "bg-green-500/20 font-semibold" : ""
                        } ${lost ? "line-through opacity-40" : ""}`}
                      >
                        {e ? e.title : <span className="opacity-30">por definir</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
