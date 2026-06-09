import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaItem } from "@/types";

export default async function AnimePage() {
  const animeList = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "anime"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt));

  return (
    <div className="pt-6">
      <div className="px-4 md:px-6 mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Anime</h1>
        <p className="text-muted text-sm mt-1">{animeList.length} {animeList.length === 1 ? "title" : "titles"}</p>
      </div>

      {animeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">No anime yet</h2>
          <p className="text-muted text-sm max-w-xs">Scan your Put.io library to discover anime.</p>
        </div>
      ) : (
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {animeList.map((item) => (
              <MediaCard key={item.id} item={item as MediaItem} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
