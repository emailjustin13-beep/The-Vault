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
  sm: { width: 120, height: 180, class: "w-28 md:w-32" },
  md: { width: 160, height: 240, class: "w-36 md:w-44" },
  lg: { width: 200, height: 300, class: "w-44 md:w-52" },
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
      className={cn("group flex-shrink-0 block", dims.class, className)}
    >
      <div
        className="relative rounded-xl overflow-hidden bg-[#1a1a1a] aspect-[2/3]"
        style={{
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 0 12px rgba(255,255,255,0.06), 0 0 24px rgba(255,255,255,0.03)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
            <div className="text-3xl mb-2">🎬</div>
            <span className="text-xs text-[#555] leading-tight line-clamp-3">{displayTitle}</span>
          </div>
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }} />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>

        {rating && rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded px-1.5 py-0.5"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <Star className="w-2.5 h-2.5 fill-white text-white" />
            <span className="text-[10px] font-medium text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {progressPercent > 0 && !progress?.completed && (
          <div className="absolute bottom-0 inset-x-0 h-0.5" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        {progress?.completed && (
          <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-[#ccc] group-hover:text-white transition-colors line-clamp-1">
          {displayTitle}
        </p>
        {releaseDate && (
          <p className="text-xs mt-0.5" style={{ color: "#444" }}>{formatYear(releaseDate)}</p>
        )}
      </div>
    </Link>
  );
}
