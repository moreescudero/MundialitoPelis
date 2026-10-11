import Image from "next/image";
import type { Entry } from "@/lib/types";

export function Poster({ movie, className = "" }: { movie: Pick<Entry, "title" | "poster">; className?: string }) {
  return movie.poster ? (
    <Image src={movie.poster} alt={movie.title} width={342} height={513} className={`h-auto w-full ${className}`} />
  ) : (
    <span className={`flex aspect-[2/3] items-center justify-center bg-foreground/10 p-2 text-center text-sm ${className}`}>
      {movie.title}
    </span>
  );
}

export function SourceBadge({ label }: { label: string }) {
  return (
    <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
      {label}
    </span>
  );
}
