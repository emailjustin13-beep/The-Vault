import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star, Calendar } from "lucide-react";
import { tmdbImageUrl, formatYear } from "@/lib/utils";
import { MediaItem, TMDbMediaData } from "@/types";

interface HeroBannerProps {
  item: MediaItem;
}

export function HeroBanner({ item }: HeroBannerProps) {
  const tmdb = item.tmdbData as TMDbMediaData | null;
  if (!tmdb) return null;

  const backdropPath = tmdb.backdropPath || tmdb.posterPath;
  if (!backdropPath) return null;

  const displayTitle = tmdb.title || tmdb.name || item.title;
  const releaseDate = tmdb.releaseDate || tmdb.firstAirDate;
  const rating = tmdb.voteAverage;
  const genres = (tmdb.genres || []).slice(0, 3);
  const overview = tmdb.overview;
  const isTV = item.type === "tv" || item.type === "anime";

  return (
    <div style={{ position: "relative", width: "100%", height: 280, overflow: "hidden", marginBottom: 24 }}>
      {/* Backdrop image */}
      <Image
        src={tmdbImageUrl(backdropPath, "w780")}
        alt={displayTitle}
        fill
        priority
        style={{ objectFit: "cover", objectPosition: "center top" }}
      />

      {/* Gradient overlays */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, #080808 0%, rgba(8,8,8,0.85) 40%, rgba(8,8,8,0.4) 70%, rgba(8,8,8,0.2) 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to right, #080808 0%, rgba(8,8,8,0.6) 50%, transparent 100%)",
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 16px 20px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "#fff",
          lineHeight: 1.2, margin: 0,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          {displayTitle}
        </h1>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {releaseDate && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#999" }}>
              <Calendar style={{ width: 12, height: 12 }} />
              {formatYear(releaseDate)}
            </span>
          )}
          {rating && rating > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fff" }}>
              <Star style={{ width: 12, height: 12, fill: "#fff" }} />
              {rating.toFixed(1)}
            </span>
          )}
          {genres.map((g) => (
            <span key={g.id} style={{
              fontSize: 10, color: "#999",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 999, padding: "2px 8px",
            }}>
              {g.name}
            </span>
          ))}
        </div>

        {/* Overview */}
        {overview && (
          <p style={{
            fontSize: 13, color: "#888", lineHeight: 1.5, margin: 0,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {overview}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Link
            href={isTV ? `/media/${item.id}` : `/watch/${item.id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#fff", color: "#000",
              fontWeight: 600, fontSize: 13,
              borderRadius: 10, padding: "8px 18px",
              textDecoration: "none",
            }}
          >
            <Play style={{ width: 14, height: 14, fill: "#000" }} />
            Play
          </Link>
          <Link
            href={`/media/${item.id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.1)", color: "#fff",
              fontWeight: 500, fontSize: 13,
              borderRadius: 10, padding: "8px 18px",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Info style={{ width: 14, height: 14 }} />
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
