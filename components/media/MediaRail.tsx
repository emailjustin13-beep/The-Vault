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

  const visible = items.slice(0, 4);

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, paddingLeft: 16, paddingRight: 16 }}>
        {visible.map((item) => (
          <MediaCard key={item.id} item={item} progress={progress?.[item.id]} size={size} />
        ))}
      </div>
    </section>
  );
}
