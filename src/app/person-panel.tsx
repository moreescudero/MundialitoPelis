"use client";

import { useRef, useState } from "react";
import type { PersonList } from "@/lib/storage";
import type { LbFilm } from "@/lib/types";

async function readError(res: Response) {
  const data = await res.json().catch(() => null);
  return data?.error ?? `Error ${res.status}`;
}

export function PersonPanel({
  title,
  value,
  onChange,
}: {
  title: string;
  value: PersonList | null;
  onChange: (list: PersonList | null) => void;
}) {
  const [label, setLabel] = useState(value?.label ?? "");
  const [username, setUsername] = useState(value?.username ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(request: () => Promise<Response>, user: string | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) throw new Error(await readError(res));
      const { films } = (await res.json()) as { films: LbFilm[] };
      onChange({ label: label.trim() || title, username: user, films });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const fromUser = () => {
    const user = username.trim().replace(/^@/, "");
    if (!user) return setError("Escribí el usuario de Letterboxd.");
    return load(() => fetch(`/api/letterboxd/watchlist?user=${encodeURIComponent(user)}`), user);
  };

  const fromCsv = async (file: File) =>
    load(async () => fetch("/api/letterboxd/csv", { method: "POST", body: await file.text() }), null);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-foreground/15 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nombre (ej: More)"
        className="rounded-lg border border-foreground/20 bg-transparent px-3 py-2"
      />
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fromUser()}
          placeholder="Usuario de Letterboxd"
          className="min-w-0 flex-1 rounded-lg border border-foreground/20 bg-transparent px-3 py-2"
        />
        <button
          onClick={fromUser}
          disabled={loading}
          className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Cargar"}
        </button>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="self-start text-sm underline opacity-70 hover:opacity-100"
      >
        o subir watchlist.csv
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) fromCsv(f);
          e.target.value = "";
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {value && !error && (
        <p className="text-sm opacity-80">
          ✓ {value.films.length} películas en la watchlist de <b>{value.label}</b>
        </p>
      )}
    </section>
  );
}
