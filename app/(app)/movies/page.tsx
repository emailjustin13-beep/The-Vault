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
    <div className="pt-6 pb-20">
      <div className="px-4 md:px-6 mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Movies</h1>
        <p style={{ color: "#555" }} className="text-sm mt-1">{movies.length} {movies.length === 1 ? "movie" : "movies"}</p>
      </div>

      {movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <h2 className="font-display font-bold text-xl text-white mb-2">No movies yet</h2>
          <p style={{ color: "#555" }} className="text-sm max-w-xs">Scan your Put.io library to discover movies.</p>
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}>
            {movies.map((movie) => (
              <div key={movie.id} style={{ width: "100%" }}>
                <MediaCard item={movie as MediaItem} size="sm" className="!w-full" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
