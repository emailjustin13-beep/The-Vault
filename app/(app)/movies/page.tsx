import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaItem } from "@/types";

export default async function MoviesPage() {
  const movies = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "movie"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt));

  return (
    <div className="pt-6">
      <div className="px-4 md:px-6 mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Movies</h1>
        <p className="text-muted text-sm mt-1">{movies.length} {movies.length === 1 ? "movie" : "movies"}</p>
      </div>

      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">No movies yet</h2>
          <p className="text-muted text-sm max-w-xs">Scan your Put.io library to discover movies.</p>
        </div>
      ) : (
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {movies.map((movie) => (
              <MediaCard key={movie.id} item={movie as MediaItem} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
