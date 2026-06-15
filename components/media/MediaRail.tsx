"use client";

import { useRef, useCallback } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // let natural horizontal trackpad gesture pass
    e.preventDefault();
    scrollRef.current.scrollLeft += e.deltaY;
  }, []);

  if (!items || items.length === 0) return null;

  const visible = items.slice(0, 20);

  return (
    <section style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0 }}>{title}</h2>
        {href && (
          <Link href={href} style={{ fontSize: 13, color: "#666", display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>
            See all <ChevronRight style={{ width: 14, height: 14 }} />
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 12,
          paddingLeft: 16,
          paddingRight: 16,
          overflowX: "auto",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: "smooth",
          paddingBottom: 8,
        }}
      >
        {visible.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            progress={progress?.[item.id]}
            size={size}
          />
        ))}
      </div>

      {/* Hide webkit scrollbar */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
