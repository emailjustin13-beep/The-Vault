import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, mediaFiles, watchProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Clock, Star, Calendar, Film, ChevronLeft, Tv2 } from "lucide-react";
import { tmdbImageUrl, formatRuntime, formatYear, getProgressPercent } from "@/lib/utils";
import { MediaItem, TMDbMediaData } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MediaDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id)).limit(1);
  if (!item) notFound();

  const files = await db.select().from(mediaFiles).where(eq(mediaFiles.mediaItemId, id));

  const [progress] = session?.user?.id
    ? await db.select().from(watchProgress).where(and(eq(watchProgress.userId, session.user.id), eq(watchProgress.mediaItemId, id))).limit(1)
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
  const isTV = item.type === "tv" || item.type === "anime";

  const episodesBySeason: Record<number, { file: typeof files[0]; season: number; episode: number; title: string }[]> = {};

  if (isTV && files.length > 0) {
    for (const file of files) {
      const seasonMatch = file.filename.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
      if (seasonMatch) {
        const season = parseInt(seasonMatch[1]);
        const episode = parseInt(seasonMatch[2]);
        if (!episodesBySeason[season]) episodesBySeason[season] = [];
        episodesBySeason[season].push({ file, season, episode, title: `Episode ${episode}` });
      } else {
        if (!episodesBySeason[1]) episodesBySeason[1] = [];
        episodesBySeason[1].push({ file, season: 1, episode: episodesBySeason[1].length + 1, title: file.filename });
      }
    }
    for (const season of Object.keys(episodesBySeason)) {
      episodesBySeason[Number(season)].sort((a, b) => a.episode - b.episode);
    }
  }

  const seasons = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);
  const primaryFile = files[0];
  const progressPercent = progress ? getProgressPercent(progress.position, progress.duration) : 0;

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-[28vh] md:h-[55vh] overflow-hidden">
        {backdropPath ? (
          <>
            <Image src={tmdbImageUrl(backdropPath, "w780")} alt={displayTitle} fill className="object-cover object-center" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 hero-gradient" />
          </>
        ) : (
          <div className="absolute inset-0 bg-surface" />
        )}
        <div className="absolute top-4 left-4">
          <Link href="javascript:history.back()" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 -mt-16 md:-mt-28 relative z-10 pb-12">
        <div className="flex flex-row gap-4 md:gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-24 md:w-44">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card shadow-2xl">
              {posterPath ? (
                <Image src={tmdbImageUrl(posterPath, "w342")} alt={displayTitle} width={176} height={264} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-card">
                  {isTV ? <Tv2 className="w-8 h-8 text-muted" /> : <Film className="w-8 h-8 text-muted" />}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <h1 className="font-display font-bold text-lg md:text-4xl text-white leading-tight">{displayTitle}</h1>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs md:text-sm text-muted">
              {releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />{formatYear(releaseDate)}
                </span>
              )}
              {runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />{formatRuntime(runtime)}
                </span>
              )}
              {rating && rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-white fill-white" />
                  <span className="text-white font-medium">{rating.toFixed(1)}</span>
                </span>
              )}
              {tmdb?.numberOfSeasons && <span>{tmdb.numberOfSeasons} seasons</span>}
              <span className="bg-white/10 rounded px-2 py-0.5 capitalize text-xs font-medium text-white">{item.type}</span>
            </div>

            {genres.length > 0 && (
              <div className="hidden md:flex flex-wrap gap-2 mt-3">
                {genres.map((g) => (
                  <span key={g.id} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-muted">{g.name}</span>
                ))}
              </div>
            )}

            {overview && (
              <p className="hidden md:block text-muted text-sm md:text-base leading-relaxed mt-4 max-w-2xl">{overview}</p>
            )}

            {!isTV && primaryFile && (
              <div className="mt-4">
                <Link
                  href={`/watch/${item.id}`}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold rounded-xl px-5 py-2.5 text-sm transition-colors"
                >
                  <Play className="w-4 h-4 fill-black" />
                  {progressPercent > 0 && !progress?.completed ? "Resume" : "Play"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Overview on mobile (below poster row) */}
        {overview && (
          <p className="md:hidden text-muted text-sm leading-relaxed mt-4">{overview}</p>
        )}

        {/* Genres on mobile */}
        {genres.length > 0 && (
          <div className="md:hidden flex flex-wrap gap-2 mt-3">
            {genres.map((g) => (
              <span key={g.id} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-muted">{g.name}</span>
            ))}
          </div>
        )}

        {/* Episode list */}
        {isTV && seasons.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display font-bold text-lg md:text-xl text-white mb-4">Episodes</h2>
            {seasons.map((season) => (
              <div key={season} className="mb-6">
                <h3 className="font-semibold text-sm text-muted mb-3">
                  {season === 0 ? "Specials" : `Season ${season}`}
                  <span className="ml-2 text-xs bg-white/5 rounded px-2 py-0.5">{episodesBySeason[season].length} episodes</span>
                </h3>
                <div className="space-y-2">
                  {episodesBySeason[season].map(({ file, episode }) => (
                    <Link
                      key={file.id}
                      href={`/watch/${item.id}?fileId=${file.putioFileId}`}
                      className="flex items-center gap-3 bg-surface hover:bg-card border border-white/5 rounded-xl p-3 md:p-4 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-lg flex items-center justify-center">
                        <span className="text-xs md:text-sm font-bold text-muted group-hover:text-white transition-colors">{episode}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">Episode {episode}</p>
                        <p className="text-muted text-xs mt-0.5 truncate">{file.filename}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {file.resolution && (
                          <span className="hidden sm:block text-xs bg-white/5 text-muted border border-white/10 rounded px-2 py-0.5">{file.resolution}</span>
                        )}
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                          <Play className="w-3 h-3 md:w-4 md:h-4 text-white group-hover:text-black fill-current ml-0.5" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
