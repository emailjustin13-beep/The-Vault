"use client";

import { useState, useEffect } from "react";
import { Search, Check, X, ChevronDown, ChevronUp, Film, Tv2 } from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  type: string;
  status: string;
  confidence: number | null;
  year: number | null;
  season: number | null;
  episode: number | null;
  tmdbId: number | null;
  tmdbData: any;
}

interface TMDbResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export default function ReviewPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, TMDbResult[]>>({});
  const [searching, setSearching] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "needs_review" | "unmatched">("all");

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/review");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function searchTMDb(itemId: string, query: string, type: string) {
    if (!query.trim()) return;
    setSearching((p) => ({ ...p, [itemId]: true }));
    try {
      const res = await fetch(`/api/review/search?q=${encodeURIComponent(query)}&type=${type}`);
      const data = await res.json();
      setSearchResults((p) => ({ ...p, [itemId]: data.results || [] }));
    } catch {
      setSearchResults((p) => ({ ...p, [itemId]: [] }));
    } finally {
      setSearching((p) => ({ ...p, [itemId]: false }));
    }
  }

  async function approveMatch(itemId: string, tmdbResult: TMDbResult, type: string) {
    setApproving((p) => ({ ...p, [itemId]: true }));
    try {
      const res = await fetch("/api/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaItemId: itemId, tmdbId: tmdbResult.id, mediaType: type }),
      });
      if (res.ok) setApproved((p) => ({ ...p, [itemId]: true }));
    } catch {
    } finally {
      setApproving((p) => ({ ...p, [itemId]: false }));
    }
  }

  async function dismissItem(itemId: string) {
    try {
      await fetch("/api/review/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaItemId: itemId }),
      });
      setDismissed((p) => ({ ...p, [itemId]: true }));
    } catch {}
  }

  const filteredItems = items.filter((item) => {
    if (approved[item.id] || dismissed[item.id]) return false;
    if (filter === "needs_review") return item.status === "needs_review";
    if (filter === "unmatched") return item.status === "unmatched";
    return true;
  });

  const needsReviewCount = items.filter((i) => i.status === "needs_review" && !approved[i.id] && !dismissed[i.id]).length;
  const unmatchedCount = items.filter((i) => i.status === "unmatched" && !approved[i.id] && !dismissed[i.id]).length;

  return (
    <div className="pt-6 pb-12">
      <div className="px-4 md:px-6 mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Review Matches</h1>
        <p className="text-muted text-sm mt-1">Approve or correct metadata matches for your library</p>
      </div>

      <div className="px-4 md:px-6 flex gap-3 mb-6 flex-wrap">
        {[
          { label: "All", value: "all", count: needsReviewCount + unmatchedCount },
          { label: "Needs Review", value: "needs_review", count: needsReviewCount },
          { label: "Unmatched", value: "unmatched", count: unmatchedCount },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as "all" | "needs_review" | "unmatched")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              filter === f.value
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-surface text-muted border-white/5 hover:text-white"
            }`}
          >
            {f.label}
            <span className={`text-xs rounded-full px-2 py-0.5 ${filter === f.value ? "bg-accent/20" : "bg-white/10"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">All caught up!</h2>
          <p className="text-muted text-sm">No items need review right now.</p>
        </div>
      )}

      <div className="px-4 md:px-6 space-y-3">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-surface border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 p-1.5 rounded-lg ${item.type === "movie" ? "bg-blue-500/10" : "bg-purple-500/10"}`}>
