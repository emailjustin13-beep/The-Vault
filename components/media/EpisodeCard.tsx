"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { tmdbImageUrl } from "@/lib/utils";

interface EpisodeCardProps {
  href: string;
  episode: number;
  resolution?: string | null;
  backdropPath?: string | null;
}

export function EpisodeCard({ href, episode, resolution, backdropPath }: EpisodeCardProps) {
  return (
    <Link href={href} style={{ textDecoration: "none", flexShrink: 0 }}>
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
        <div
          style={{
            width: 200,
            height: 112,
            background: "#111",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {backdropPath && (
            <Image
              src={tmdbImageUrl(backdropPath, "w342")}
              alt={`Episode ${episode}`}
              fill
              className="object-cover"
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play style={{ width: 12, height: 12, fill: "#fff", color: "#fff", marginLeft: 2 }} />
            </div>
          </div>
        </div>

        <div style={{ padding: "8px 10px 10px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0 }}>
            {episode}. Episode {episode}
          </p>
          {resolution && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{resolution}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
