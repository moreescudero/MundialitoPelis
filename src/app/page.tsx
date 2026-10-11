import { Setup } from "./setup";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">🏆 Mundial de Películas</h1>
        <p className="opacity-70">
          Cargá las watchlists de Letterboxd, cruzamos lo que tienen en común y las películas se
          enfrentan hasta que quede una campeona.
        </p>
      </header>
      <Setup />
    </main>
  );
}
