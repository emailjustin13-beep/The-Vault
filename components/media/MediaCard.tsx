"use client";

import Link from "next/link";
import Image from "next/image";
import { cn, tmdbImageUrl, formatYear, getProgressPercent } from "@/lib/utils";
import { Play, Star } from "lucide-react";
import { MediaItem, WatchProgress } from "@/types";

interface MediaCardProps {
  item: MediaItem;
  progress?: WatchProgress;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const POSTER_SIZES = {
  sm: { width: 100, height: 150 },
  md: { width: 130, height: 195 },
  lg: { width: 160, height: 240 },
};

export function MediaCard({ item, progress, size = "md", className }: MediaCardProps) {
  const dims = POSTER_SIZES[size];
  const tmdbData = item.tmdbData as any;
  const posterPath = tmdbData?.posterPath || tmdbData?.poster_path || null;
  const rating = tmdbData?.voteAverage || tmdbData?.vote_average;
  const releaseDate = tmdbData?.releaseDate || tmdbData?.release_date || tmdbData?.firstAirDate || tmdbData?.first_air_date;
  const displayTitle = tmdbData?.title || tmdbData?.name || item.title;
  const progressPercent = progress ? getProgressPercent(progress.position, progress.duration) : 0;

  return (
    <Link
      href={`/media/${item.id}`}
      className={cn("group block flex-shrink-0", className)}
      style={{ width: dims.width }}
    >
      <div
        style={{
          width: dims.width,
          height: dims.height,
          borderRadius: 10,
          overflow: "hidden",
          position: "relative",
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 0 12px rgba(255,255,255,0.06), 0 0 24px rgba(255,255,255,0.03)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = "scale(1.06)";
          el.style.boxShadow = "0 0 20px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.7)";
          el.style.borderColor = "rgba(255,255,255,0.35)";
          el.style.zIndex = "10";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = "scale(1)";
          el.style.boxShadow = "0 0 12px rgba(255,255,255,0.06), 0 0 24px rgba(255,255,255,0.03)";
          el.style.borderColor = "rgba(255,255,255,0.18)";
          el.style.zIndex = "auto";
        }}
      >
        {posterPath ? (
          <Image
            src={tmdbImageUrl(posterPath, "w342")}
            alt={displayTitle}
            fill
            sizes={`${dims.width}px`}
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎬</div>
            <span style={{ fontSize: 11, color: "#555", lineHeight: 1.3 }}>{displayTitle}</span>
          </div>
        )}

        <div
          style={{ position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.2s", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
          className="group-hover:opacity-100"
        />

        <div
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
          className="group-hover:opacity-100"
        >
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play style={{ width: 14, height: 14, color: "#fff", fill: "#fff", marginLeft: 2 }} />
          </div>
        </div>

        {rating && rating > 0 && (
          <div style={{ position: "absolute", top: 6, right: 6, display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "2px 5px" }}>
            <Star style={{ width: 9, height: 9, fill: "#fff", color: "#fff" }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: "#fff" }}>{rating.toFixed(1)}</span>
          </div>
        )}

        {progressPercent > 0 && !progress?.completed && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.15)" }}>
            <div style={{ height: "100%", width: `${progressPercent}%`, background: "#fff" }} />
          </div>
        )}

        {progress?.completed && (
          <div style={{ position: "absolute", bottom: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg style={{ width: 10, height: 10, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, paddingLeft: 2 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: dims.width }}>
          {displayTitle}
        </p>
        {releaseDate && (
          <p style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{formatYear(releaseDate)}</p>
        )}
      </div>
    </Link>
  );
}
