import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, mediaFiles, watchProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Clock,
  Star,
  Calendar,
  Film,
  ChevronLeft,
} from "lucide-react";
import { tmdbImageUrl, formatRuntime, formatYear, formatDuration, getProgressPercent } from "@/lib/utils";
import { MediaItem, TMDbMediaData } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MediaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [item] = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.id, id))
    .limit(1);

  if (!item) notFound();

  const files = await db
    .select()
    .from(mediaFiles)
    .where(eq(mediaFiles.mediaItemId, id));

  const [progress] = session?.user?.id
    ? await db
        .select()
        .from(watchProgress)
        .where(
          and(
            eq(watchProgress.userId, session.user.id),
            eq(watchProgress.mediaItemId, id)
          )
        )
        .limit(1)
    : [undefined];

  const tmdb = item.tmdbData as TMDbMediaData | null;
  const displayTitle = tmdb?.title || tmdb?.name || item.title;
  const overview = tmdb?.overview;
  const posterPath = tmdb?.posterPath;
  const backdropPath = tmdb?.backdropPath;
  const rating = tmdb?.voteAverage;
  const runtime = tmdb?.runtime || tmdb?.episodeRunTime?.[0];
  const releaseDate = tmdb?.releaseDate || tmdb?.firstAirDate;
  const genres = tmdb?.genres || [];
  const tagline = tmdb?.tagline;

  const progressPercent = progress
    ? getProgressPercent(progress.position, progress.duration)
    : 0;

  const primaryFile = files[0];

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {backdropPath ? (
          <>
            <Image
              src={tmdbImageUrl(backdropPath, "w780")}
              alt={displayTitle}
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 hero-gradient" />
          </>
        ) : (
          <div className="absolute inset-0 bg-surface" />
        )}

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link
            href="javascript:history.back()"
            className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 -mt-32 relative z-10 pb-12">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-36 md:w-48 mx-auto md:mx-0">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card shadow-2xl">
              {posterPath ? (
                <Image
                  src={tmdbImageUrl(posterPath, "w342")}
                  alt={displayTitle}
                  width={192}
                  height={288}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-card">
                  <Film className="w-12 h-12 text-muted" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            {/* Title */}
            <h1 className="font-display font-bold text-2xl md:text-4xl text-white leading-tight">
              {displayTitle}
            </h1>

            {tagline && (
              <p className="text-muted italic text-sm md:text-base mt-1">{tagline}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-sm text-muted">
              {releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatYear(releaseDate)}
                </span>
              )}
              {runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRuntime(runtime)}
                </span>
              )}
              {rating && rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                  <span className="text-white font-medium">{rating.toFixed(1)}</span>
                </span>
              )}
              <span className="bg-white/10 rounded px-2 py-0.5 capitalize text-xs font-medium text-white">
                {item.type}
              </span>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-muted"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {overview && (
              <p className="text-muted text-sm md:text-base leading-relaxed mt-4 max-w-2xl">
                {overview}
              </p>
            )}

            {/* Action buttons */}
            {primaryFile && (
              <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 mt-6">
                <Link
                  href={`/watch/${item.id}`}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-black font-bold rounded-xl px-6 py-3 transition-colors shadow-lg shadow-accent/20"
                >
                  <Play className="w-5 h-5 fill-black" />
                  {progressPercent > 0 && !progress?.completed ? "Resume" : "Play"}
                </Link>

                {/* Progress indicator */}
                {progressPercent > 0 && !progress?.completed && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span>{progressPercent}%</span>
                  </div>
                )}
              </div>
            )}

            {/* File info */}
            {primaryFile && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                {primaryFile.resolution && (
                  <span className="text-xs bg-accent/10 text-accent border border-accent/20 rounded px-2 py-1 font-medium">
                    {primaryFile.resolution}
                  </span>
                )}
                {primaryFile.codec && (
                  <span className="text-xs bg-white/5 text-muted border border-white/10 rounded px-2 py-1">
                    {primaryFile.codec}
                  </span>
                )}
                {primaryFile.source && (
                  <span className="text-xs bg-white/5 text-muted border border-white/10 rounded px-2 py-1">
                    {primaryFile.source}
                  </span>
                )}
                {primaryFile.hasSubtitles && (
                  <span className="text-xs bg-white/5 text-muted border border-white/10 rounded px-2 py-1">
                    Subtitles
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
