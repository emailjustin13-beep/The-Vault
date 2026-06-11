"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { MediaItem, WatchProgress } from "@/types";

interface MediaRailProps {
  title: string;
  items: MediaItem[];
  progress?: Record<string, WatchProgress>;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function MediaRail({ title, items, progress, href, size = "md" }: MediaRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 px-4 md:px-6">
        <h2 className="font-display font-semibold text-lg text-white">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div
        className="flex gap-3 px-4 md:px-6 pb-2"
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          touchAction: "pan-x",
        }}
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} progress={progress?.[item.id]} size={size} />
        ))}
      </div>
    </section>
  );
}
