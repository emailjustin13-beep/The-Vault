import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, watchProgress } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { MediaRail } from "@/components/media/MediaRail";
import { MediaItem, WatchProgress } from "@/types";

async function getHomeData(userId: string) {
  // Continue watching
  const recentProgress = await db
    .select()
    .from(watchProgress)
    .where(and(eq(watchProgress.userId, userId), eq(watchProgress.completed, false)))
    .orderBy(desc(watchProgress.lastWatchedAt))
    .limit(20);

  const continueWatchingIds = recentProgress.map((p) => p.mediaItemId);
  const continueWatchingItems = continueWatchingIds.length > 0
    ? await db
        .select()
        .from(mediaItems)
        .where(inArray(mediaItems.id, continueWatchingIds))
    : [];

  // Recently added
  const recentlyAdded = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.status, "matched"))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  // Movies
  const movies = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "movie"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  // TV Shows
  const tvShows = await db
    .select()
    .from(mediaItems)
    .where(and(eq(mediaItems.type, "tv"), eq(mediaItems.status, "matched")))
    .orderBy(desc(mediaItems.addedAt))
    .limit(20);

  // Anime
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

  return (
    <div className="pt-6">
      {/* Header */}
      <div className="px-4 md:px-6 mb-8">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">
          Good {getGreeting()},{" "}
          <span className="text-accent">{session?.user?.name?.split(" ")[0] || "there"}</span>
        </h1>
        <p className="text-muted text-sm mt-1">What are you watching today?</p>
      </div>

      {!hasContent ? (
        <EmptyLibrary />
      ) : (
        <>
          <MediaRail
            title="Continue Watching"
            items={data.continueWatching}
            progress={data.progressMap}
            href="/home"
          />
          <MediaRail
            title="Recently Added"
            items={data.recentlyAdded}
            progress={data.progressMap}
            href="/home"
          />
          <MediaRail title="Movies" items={data.movies} href="/movies" />
          <MediaRail title="TV Shows" items={data.tvShows} href="/tv" />
          <MediaRail title="Anime" items={data.anime} href="/anime" />
        </>
      )}
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
      <div className="text-6xl mb-4">📦</div>
      <h2 className="font-display font-bold text-xl text-white mb-2">Your vault is empty</h2>
      <p className="text-muted text-sm max-w-xs mb-6">
        Connect Put.io and scan your library to start streaming your media collection.
      </p>
      <a
        href="/settings"
        className="bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
      >
        Go to Settings
      </a>
    </div>
  );
}
