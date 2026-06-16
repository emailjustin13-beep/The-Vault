import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, mediaFiles, watchProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Clock, Star, Calendar, Film, Tv2, Globe } from "lucide-react";
import { tmdbImageUrl, formatRuntime, formatYear, getProgressPercent } from "@/lib/utils";
import { TMDbMediaData } from "@/types";
import BackButton from "@/components/ui/BackButton";

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
  const originCountry = (tmdb as any)?.originCountry?.[0] || null;
  const contentRating = (tmdb as any)?.contentRatings?.results?.[0]?.rating || null;

  const episodesBySeason: Record<number, { file: typeof files[0]; season: number; episode: number }[]> = {};

  if (isTV && files.length > 0) {
    for (const file of files) {
      const seasonMatch = file.filename.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
      if (seasonMatch) {
        const season = parseInt(seasonMatch[1]);
        const episode = parseInt(seasonMatch[2]);
        if (!episodesBySeason[season]) episodesBySeason[season] = [];
        episodesBySeason[season].push({ file, season, episode });
      } else {
        if (!episodesBySeason[1]) episodesBySeason[1] = [];
        episodesBySeason[1].push({ file, season: 1, episode: episodesBySeason[1].length + 1 });
      }
    }
    for (const season of Object.keys(episodesBySeason)) {
      episodesBySeason[Number(season)].sort((a, b) => a.episode - b.episode);
    }
  }

  const seasons = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);
  const primaryFile = files[0];
  const progressPercent = progress ? getProgressPercent(progress.position, progress.duration) : 0;
  const hasProgress = progressPercent > 0 && !progress?.completed;

  return (
    <div className="min-h-screen bg-black">

      {/* ── HERO ── */}
      <div className="relative w-full" style={{ aspectRatio: "16/7", minHeight: 260, maxHeight: 520 }}>
        {backdropPath ? (
          <Image
            src={tmdbImageUrl(backdropPath, "original")}
            alt={displayTitle}
            fill
            className="object-cover object-top"
            priority
          />
        ) : posterPath ? (
          <Image
            src={tmdbImageUrl(posterPath, "w780")}
            alt={displayTitle}
            fill
            className="object-cover object-center"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-surface flex items-center justify-center">
            {isTV ? <Tv2 className="w-16 h-16 text-white/10" /> : <Film className="w-16 h-16 text-white/10" />}
          </div>
        )}

        {/* gradient overlays */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />

        {/* back button */}
        <div className="absolute top-4 left-4 z-10">
          <BackButton />
        </div>

        {/* title pinned to bottom-left of hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)", fontWeight: 800, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 16px rgba(0,0,0,0.8)", marginBottom: 6 }}>
            {displayTitle}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {releaseDate && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{formatYear(releaseDate)}</span>
            )}
            {runtime && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{formatRuntime(runtime)}</span>
            )}
            {tmdb?.numberOfSeasons && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{tmdb.numberOfSeasons} seasons</span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "20px 20px 60px" }}>

        {/* metadata pills row */}
        {(contentRating || genres.length > 0 || originCountry || rating) && (
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            {contentRating && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Rating</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{contentRating}</div>
              </div>
            )}
            {genres[0] && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Genre</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{genres[0].name}</div>
              </div>
            )}
            {originCountry && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Origin</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{originCountry}</div>
              </div>
            )}
            {rating && rating > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>TMDb</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Star style={{ width: 12, height: 12, fill: "#fff", color: "#fff" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{rating.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Play / Resume button */}
        {!isTV && primaryFile && (
          <Link
            href={`/watch/${item.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              maxWidth: 480,
              background: "#fff",
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 30,
              padding: "13px 0",
              marginBottom: 16,
              textDecoration: "none",
            }}
          >
            <Play style={{ width: 16, height: 16, fill: "#000" }} />
            {hasProgress ? "Continue" : "Play"}
          </Link>
        )}

        {/* progress bar under button for movies */}
        {!isTV && hasProgress && (
          <div style={{ width: "100%", maxWidth: 480, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, marginBottom: 20 }}>
            <div style={{ height: "100%", width: `${progressPercent}%`, background: "#fff", borderRadius: 2 }} />
          </div>
        )}

        {/* overview */}
        {overview && (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 28, maxWidth: 640 }}>
            {overview}
          </p>
        )}

        {/* ── EPISODES ── */}
        {isTV && seasons.length > 0 && seasons.map((season) => (
          <div key={season} style={{ marginBottom: 32 }}>

            {/* season header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
                {season === 0 ? "Specials" : `Season ${season}`}
              </h2>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                {episodesBySeason[season].length} episodes
              </span>
            </div>

            {/* horizontal episode scroll */}
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                overflowY: "visible",
                paddingBottom: 8,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {episodesBySeason[season].map(({ file, episode }) => (
                <Link
                  key={file.id}
                  href={`/watch/${item.id}?fileId=${file.putioFileId}`}
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <div
                    style={{
                      width: 200,
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                  >
                    {/* landscape thumbnail area */}
                    <div
                      style={{
                        width: 200,
                        height: 112,
                        background: "#111",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {backdropPath ? (
                        <Image
                          src={tmdbImageUrl(backdropPath, "w342")}
                          alt={`Episode ${episode}`}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                      {/* dark overlay + play icon */}
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Play style={{ width: 12, height: 12, fill: "#fff", color: "#fff", marginLeft: 2 }} />
                        </div>
                      </div>
                    </div>

                    {/* episode info */}
                    <div style={{ padding: "8px 10px 10px" }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0 }}>
                        {episode}. Episode {episode}
                      </p>
                      {file.resolution && (
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{file.resolution}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* TV play button (first episode) */}
        {isTV && primaryFile && seasons.length > 0 && (
          <Link
            href={`/watch/${item.id}?fileId=${episodesBySeason[seasons[0]][0].file.putioFileId}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              maxWidth: 480,
              background: "#fff",
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 30,
              padding: "13px 0",
              marginTop: 8,
              textDecoration: "none",
            }}
          >
            <Play style={{ width: 16, height: 16, fill: "#000" }} />
            {hasProgress ? "Continue Watching" : "Play S1 E1"}
          </Link>
        )}
      </div>
    </div>
  );
}
