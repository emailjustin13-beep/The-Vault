import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaItem } from "@/types";

export default async function TVPage() {
  const shows = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "tv"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt));

  return (
    <div className="pt-6">
      <div className="px-4 md:px-6 mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">TV Shows</h1>
        <p className="text-muted text-sm mt-1">{shows.length} {shows.length === 1 ? "show" : "shows"}</p>
      </div>

      {shows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">No TV shows yet</h2>
          <p className="text-muted text-sm max-w-xs">Scan your Put.io library to discover TV shows.</p>
        </div>
      ) : (
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {shows.map((show) => (
              <MediaCard key={show.id} item={show as MediaItem} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
