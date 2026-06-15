import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, watchProgress } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { MediaRail } from "@/components/media/MediaRail";
import { HeroBanner } from "@/components/home/HeroBanner";
import { MediaItem, WatchProgress } from "@/types";

async function getHomeData(userId: string) {
  const recentProgress = await db
    .select()
    .from(watchProgress)
    .where(and(eq(watchProgress.userId, userId), eq(watchProgress.completed, false)))
    .orderBy(desc(watchProgress.lastWatchedAt))
    .limit(20);

  const continueWatchingIds = recentProgress.map((p) => p.mediaItemId);
  const continueWatchingItems = continueWatchingIds.length > 0
    ? await db.select().from(mediaItems).where(inArray(mediaItems.id, continueWatchingIds))
    : [];

  const recentlyAdded = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.status, "matched"))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  const movies = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "movie"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  const tvShows = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "tv"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  const anime = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "anime"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  const progressMap: Record<string, WatchProgress> = {};
  for (const p of recentProgress) {
    progressMap[p.mediaItemId] = p as WatchProgress;
  }

  return {
    continueWatching: continueWatchingItems as MediaItem[],
    recentlyAdded: recentlyAdded as MediaItem[],
    movies: movies as MediaItem[],
    tvShows: tvShows as MediaItem[],
    anime: anime as MediaItem[],
    progressMap,
  };
}

export default async function HomePage() {
  const session = await auth();
  const data = await getHomeData(session!.user!.id!);

  const hasContent =
    data.continueWatching.length > 0 ||
    data.recentlyAdded.length > 0 ||
    data.movies.length > 0 ||
    data.tvShows.length > 0 ||
    data.anime.length > 0;

  const featuredItem =
    data.continueWatching[0] ||
    data.recentlyAdded[0] ||
    data.movies[0] ||
    data.tvShows[0] ||
    data.anime[0];

  return (
    <div>
      {featuredItem && <HeroBanner item={featuredItem} />}

      <div style={{ padding: "0 0 32px" }}>
        <div className="px-4 md:px-6 mb-6">
          <h1 className="font-display font-bold text-xl md:text-2xl text-white">
            Good {getGreeting()},{" "}
            <span style={{ color: "#555" }}>{session?.user?.name?.split(" ")[0] || "there"}</span>
          </h1>
        </div>

        {!hasContent ? (
          <EmptyLibrary />
        ) : (
          <>
            <MediaRail
              title="Continue Watching"
              items={data.continueWatching}
              progress={data.progressMap}
            />
            <MediaRail
              title="Recently Added"
              items={data.recentlyAdded}
              progress={data.progressMap}
            />
            <MediaRail title="Movies" items={data.movies} href="/movies" />
            <MediaRail title="TV Shows" items={data.tvShows} href="/tv" />
            <MediaRail title="Anime" items={data.anime} href="/anime" />
          </>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <h2 className="font-display font-bold text-xl text-white mb-2">Your vault is empty</h2>
      <p style={{ color: "#555" }} className="text-sm max-w-xs mb-6">
        Connect Put.io and scan your library to start streaming your media collection.
      </p>
      <a href="/settings" className="bg-white text-black font-semibold rounded-lg px-5 py-2.5 text-sm">
        Go to Settings
      </a>
    </div>
  );
}
