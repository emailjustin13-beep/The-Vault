"use client";

import Link from "next/link";
import { useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  function handleTouchStart(e: React.TouchEvent) {
    const el = scrollRef.current;
    if (!el) return;
    el.dataset.startX = String(e.touches[0].clientX);
    el.dataset.startY = String(e.touches[0].clientY);
    el.dataset.scrollLeft = String(el.scrollLeft);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const el = scrollRef.current;
    if (!el) return;
    const startX = parseFloat(el.dataset.startX || "0");
    const startY = parseFloat(el.dataset.startY || "0");
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);

    if (dx > dy) {
      e.stopPropagation();
      const walk = startX - e.touches[0].clientX;
      el.scrollLeft = parseFloat(el.dataset.scrollLeft || "0") + walk;
    }
  }

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
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 8,
        }}
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} progress={progress?.[item.id]} size={size} />
        ))}
      </div>
    </section>
  );
}
