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
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingLeft: 16, paddingRight: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0 }}>{title}</h2>
        {href && (
          <Link href={href} style={{ fontSize: 13, color: "#666", display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>
            See all <ChevronRight style={{ width: 14, height: 14 }} />
          </Link>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          gap: 10,
          overflowX: "scroll",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
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
