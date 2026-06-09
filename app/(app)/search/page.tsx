"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Film, Tv2, Sparkles } from "lucide-react";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaItem } from "@/types";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results || []);
        setHasSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const movies = results.filter((r) => r.type === "movie");
  const tv = results.filter((r) => r.type === "tv");
  const anime = results.filter((r) => r.type === "anime");

  return (
    <div className="pt-6 pb-8">
      {/* Search input */}
      <div className="px-4 md:px-6 mb-8">
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, anime..."
            className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white text-base placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">No results found</h2>
          <p className="text-muted text-sm">Try a different search term.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-8">
          {movies.length > 0 && (
            <section className="px-4 md:px-6">
              <h2 className="font-display font-semibold text-base text-muted mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" /> Movies ({movies.length})
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {movies.map((item) => (
                  <MediaCard key={item.id} item={item} size="sm" />
                ))}
              </div>
            </section>
          )}

          {tv.length > 0 && (
            <section className="px-4 md:px-6">
              <h2 className="font-display font-semibold text-base text-muted mb-3 flex items-center gap-2">
                <Tv2 className="w-4 h-4" /> TV Shows ({tv.length})
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {tv.map((item) => (
                  <MediaCard key={item.id} item={item} size="sm" />
                ))}
              </div>
            </section>
          )}

          {anime.length > 0 && (
            <section className="px-4 md:px-6">
              <h2 className="font-display font-semibold text-base text-muted mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Anime ({anime.length})
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {anime.map((item) => (
                  <MediaCard key={item.id} item={item} size="sm" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <SearchIcon className="w-12 h-12 text-muted/40 mb-4" />
          <h2 className="font-display font-bold text-xl text-white mb-2">Search your library</h2>
          <p className="text-muted text-sm">Find movies, TV shows, and anime from your collection.</p>
        </div>
      )}
    </div>
  );
}
