export type MediaType = "movie" | "tv" | "anime";
export type MediaStatus = "pending" | "matched" | "unmatched" | "needs_review";
export type ScanJobStatus = "queued" | "running" | "completed" | "failed";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
}

export interface MediaItem {
  id: string;
  putioFileId: string;
  type: MediaType;
  title: string;
  year: number | null;
  season: number | null;
  episode: number | null;
  tmdbId: number | null;
  tmdbData: TMDbMediaData | null;
  status: MediaStatus;
  addedAt: Date;
  lastScannedAt: Date | null;
}

export interface MediaFile {
  id: string;
  mediaItemId: string;
  putioFileId: string;
  filename: string;
  size: number;
  resolution: string | null;
  codec: string | null;
  source: string | null;
  hasSubtitles: boolean;
  createdAt: Date;
}

export interface WatchProgress {
  id: string;
  userId: string;
  mediaItemId: string;
  position: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: Date;
  mediaItem?: MediaItem;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  tmdbCollectionId: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  isAutomatic: boolean;
  createdAt: Date;
  items?: MediaItem[];
}

export interface ParsedFilename {
  title: string;
  year: number | null;
  season: number | null;
  episode: number | null;
  type: MediaType;
  resolution: string | null;
  codec: string | null;
  source: string | null;
  raw: string;
}

export interface TMDbMediaData {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
  genres: { id: number; name: string }[];
  runtime?: number;
  episodeRunTime?: number[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  status?: string;
  tagline?: string;
  belongsToCollection?: {
    id: number;
    name: string;
    posterPath: string | null;
    backdropPath: string | null;
  } | null;
}

export interface TMDbSearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv";
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
  confidence?: number;
}

export interface PutioFile {
  id: number;
  name: string;
  file_type: "FOLDER" | "VIDEO" | "AUDIO" | "IMAGE" | "ARCHIVE" | "PDF" | "TEXT" | "SWF" | "OTHER";
  size: number;
  parent_id: number;
  content_type: string;
  created_at: string;
  is_mp4_available: boolean;
  stream_url?: string;
}

export interface PutioFilesResponse {
  files: PutioFile[];
  parent: PutioFile;
  total: number;
  status: string;
}

export interface ScanJob {
  id: string;
  status: ScanJobStatus;
  totalFiles: number;
  processedFiles: number;
  matchedFiles: number;
  errorFiles: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

export interface Settings {
  id: string;
  userId: string;
  putioAccessToken: string | null;
  tmdbApiKey: string | null;
  autoScan: boolean;
  scanInterval: number;
  defaultQuality: string;
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaRail {
  title: string;
  items: MediaItem[];
  href?: string;
}

export interface VideoPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  fullscreen: boolean;
  playbackRate: number;
  buffered: number;
  subtitleTrack: string | null;
}
