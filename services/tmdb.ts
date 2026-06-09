import { TMDbMediaData, TMDbSearchResult } from "@/types";

const TMDB_BASE = "https://api.themoviedb.org/3";

interface TMDbMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  genres: { id: number; name: string }[];
  tagline: string;
  status: string;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

interface TMDbTVDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  episode_run_time: number[];
  genres: { id: number; name: string }[];
  tagline: string;
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
}

interface TMDbSearchResponse {
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    media_type: "movie" | "tv" | "person";
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
  }>;
  total_results: number;
  total_pages: number;
}

export class TMDbService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      ...params,
    });

    const url = `${TMDB_BASE}${endpoint}?${searchParams.toString()}`;
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`TMDb API error ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async searchMovie(query: string, year?: number): Promise<TMDbSearchResult[]> {
    const params: Record<string, string> = { query };
    if (year) params.year = year.toString();

    const response = await this.request<TMDbSearchResponse>("/search/movie", params);
    return response.results
      .filter((r) => r.media_type !== "person")
      .map((r) => ({
        id: r.id,
        title: r.title,
        overview: r.overview,
        posterPath: r.poster_path,
        backdropPath: r.backdrop_path,
        mediaType: "movie" as const,
        releaseDate: r.release_date,
        voteAverage: r.vote_average,
      }));
  }

  async searchTV(query: string, year?: number): Promise<TMDbSearchResult[]> {
    const params: Record<string, string> = { query };
    if (year) params.first_air_date_year = year.toString();

    const response = await this.request<TMDbSearchResponse>("/search/tv", params);
    return response.results.map((r) => ({
      id: r.id,
      name: r.name,
      overview: r.overview,
      posterPath: r.poster_path,
      backdropPath: r.backdrop_path,
      mediaType: "tv" as const,
      firstAirDate: r.first_air_date,
      voteAverage: r.vote_average,
    }));
  }

  async searchMulti(query: string): Promise<TMDbSearchResult[]> {
    const response = await this.request<TMDbSearchResponse>("/search/multi", { query });
    return response.results
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((r) => ({
        id: r.id,
        title: r.title,
        name: r.name,
        overview: r.overview,
        posterPath: r.poster_path,
        backdropPath: r.backdrop_path,
        mediaType: r.media_type as "movie" | "tv",
        releaseDate: r.release_date,
        firstAirDate: r.first_air_date,
        voteAverage: r.vote_average,
      }));
  }

  async getMovieDetails(tmdbId: number): Promise<TMDbMediaData> {
    const movie = await this.request<TMDbMovieDetails>(`/movie/${tmdbId}`);
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      runtime: movie.runtime ?? undefined,
      genres: movie.genres,
      tagline: movie.tagline,
      status: movie.status,
      belongsToCollection: movie.belongs_to_collection ? {
        id: movie.belongs_to_collection.id,
        name: movie.belongs_to_collection.name,
        posterPath: movie.belongs_to_collection.poster_path,
        backdropPath: movie.belongs_to_collection.backdrop_path,
      } : null,
    };
  }

  async getTVDetails(tmdbId: number): Promise<TMDbMediaData> {
    const show = await this.request<TMDbTVDetails>(`/tv/${tmdbId}`);
    return {
      id: show.id,
      name: show.name,
      overview: show.overview,
      posterPath: show.poster_path,
      backdropPath: show.backdrop_path,
      firstAirDate: show.first_air_date,
      voteAverage: show.vote_average,
      episodeRunTime: show.episode_run_time,
      genres: show.genres,
      tagline: show.tagline,
      status: show.status,
      numberOfSeasons: show.number_of_seasons,
      numberOfEpisodes: show.number_of_episodes,
    };
  }

  async getCollection(collectionId: number): Promise<{
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    parts: Array<{ id: number; title: string }>;
  }> {
    return this.request(`/collection/${collectionId}`);
  }

  async verifyKey(): Promise<boolean> {
    try {
      await this.request("/configuration");
      return true;
    } catch {
      return false;
    }
  }

  calculateConfidence(parsed: { title: string; year?: number | null }, result: TMDbSearchResult): number {
    const resultTitle = (result.title || result.name || "").toLowerCase();
    const parsedTitle = parsed.title.toLowerCase();

    let score = 0;

    // Exact title match
    if (resultTitle === parsedTitle) {
      score += 60;
    } else if (resultTitle.includes(parsedTitle) || parsedTitle.includes(resultTitle)) {
      score += 40;
    } else {
      const parsedWords = parsedTitle.split(" ");
      const matchedWords = parsedWords.filter((w) => resultTitle.includes(w));
      score += Math.round((matchedWords.length / parsedWords.length) * 30);
    }

    // Year match
    if (parsed.year) {
      const resultYear = result.releaseDate
        ? new Date(result.releaseDate).getFullYear()
        : result.firstAirDate
        ? new Date(result.firstAirDate).getFullYear()
        : null;

      if (resultYear === parsed.year) {
        score += 30;
      } else if (resultYear && Math.abs(resultYear - parsed.year) === 1) {
        score += 15;
      }
    }

    // Popularity bonus
    if (result.voteAverage > 7) score += 10;

    return Math.min(100, score);
  }
}

export function createTMDbService(apiKey?: string): TMDbService | null {
  const key = apiKey || process.env.TMDB_API_KEY;
  if (!key) return null;
  return new TMDbService(key);
}
