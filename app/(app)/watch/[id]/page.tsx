import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, mediaFiles, watchProgress, settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { TMDbMediaData } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fileId?: string }>;
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { fileId: queryFileId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  if (!item) notFound();

  // Use specific fileId from query param (for TV episodes) or fall back to first file
  let file;
  if (queryFileId) {
    [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.putioFileId, queryFileId)).limit(1);
  } else {
    [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.mediaItemId, id)).limit(1);
  }

  if (!file) notFound();

  const [progress] = await db.select().from(watchProgress).where(
    and(eq(watchProgress.userId, session.user.id), eq(watchProgress.mediaItemId, id))
  ).limit(1);

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);

  if (!userSettings?.putioAccessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="font-display font-bold text-xl text-white mb-2">Put.io not connected</h2>
          <p className="text-muted text-sm mb-4">Connect your Put.io account in Settings to stream media.</p>
          <a href="/settings" className="bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors">
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  const tmdb = item.tmdbData as TMDbMediaData | null;
  const displayTitle = tmdb?.title || tmdb?.name || item.title;
  const streamUrl = `/api/putio/stream?fileId=${file.putioFileId}`;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <VideoPlayer
        mediaItemId={id}
        streamUrl={streamUrl}
        title={displayTitle}
        startPosition={progress?.position || 0}
        duration={progress?.duration || 0}
      />
    </div>
  );
}
