import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  real,
  index,
  uniqueIndex,
  serial,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    providerIdx: uniqueIndex("accounts_provider_idx").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    compoundKey: uniqueIndex("vt_identifier_token_idx").on(
      table.identifier,
      table.token
    ),
  })
);

export const mediaItems = pgTable(
  "media_items",
  {
    id: text("id").primaryKey(),
    putioFileId: text("putio_file_id").notNull().unique(),
    type: text("type", { enum: ["movie", "tv", "anime"] }).notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    season: integer("season"),
    episode: integer("episode"),
    tmdbId: integer("tmdb_id"),
    tmdbData: jsonb("tmdb_data"),
    status: text("status", {
      enum: ["pending", "matched", "unmatched", "needs_review"],
    })
      .notNull()
      .default("pending"),
    confidence: real("confidence"),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
    lastScannedAt: timestamp("last_scanned_at", { mode: "date" }),
  },
  (table) => ({
    typeIdx: index("media_items_type_idx").on(table.type),
    statusIdx: index("media_items_status_idx").on(table.status),
    tmdbIdx: index("media_items_tmdb_idx").on(table.tmdbId),
    titleIdx: index("media_items_title_idx").on(table.title),
  })
);

export const mediaFiles = pgTable(
  "media_files",
  {
    id: text("id").primaryKey(),
    mediaItemId: text("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    putioFileId: text("putio_file_id").notNull().unique(),
    filename: text("filename").notNull(),
    size: integer("size").notNull(),
    resolution: text("resolution"),
    codec: text("codec"),
    source: text("source"),
    hasSubtitles: boolean("has_subtitles").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    mediaItemIdx: index("media_files_media_item_idx").on(table.mediaItemId),
  })
);

export const watchProgress = pgTable(
  "watch_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaItemId: text("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0),
    duration: real("duration").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    lastWatchedAt: timestamp("last_watched_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userMediaIdx: uniqueIndex("watch_progress_user_media_idx").on(
      table.userId,
      table.mediaItemId
    ),
    userIdx: index("watch_progress_user_idx").on(table.userId),
    lastWatchedIdx: index("watch_progress_last_watched_idx").on(
      table.lastWatchedAt
    ),
  })
);

export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  tmdbCollectionId: integer("tmdb_collection_id"),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  isAutomatic: boolean("is_automatic").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const collectionItems = pgTable(
  "collection_items",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    mediaItemId: text("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    collectionIdx: index("collection_items_collection_idx").on(
      table.collectionId
    ),
    uniqueItem: uniqueIndex("collection_items_unique_idx").on(
      table.collectionId,
      table.mediaItemId
    ),
  })
);

export const metadataCache = pgTable(
  "metadata_cache",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    data: jsonb("data").notNull(),
    cachedAt: timestamp("cached_at", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    tmdbIdx: uniqueIndex("metadata_cache_tmdb_idx").on(
      table.tmdbId,
      table.mediaType
    ),
  })
);

export const scanJobs = pgTable("scan_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed"],
  })
    .notNull()
    .default("queued"),
  totalFiles: integer("total_files").notNull().default(0),
  processedFiles: integer("processed_files").notNull().default(0),
  matchedFiles: integer("matched_files").notNull().default(0),
  errorFiles: integer("error_files").notNull().default(0),
  startedAt: timestamp("started_at", { mode: "date" }),
  completedAt: timestamp("completed_at", { mode: "date" }),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  putioAccessToken: text("putio_access_token"),
  tmdbApiKey: text("tmdb_api_key"),
  autoScan: boolean("auto_scan").notNull().default(false),
  scanInterval: integer("scan_interval").notNull().default(24),
  defaultQuality: text("default_quality").notNull().default("1080p"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MediaItem = typeof mediaItems.$inferSelect;
export type NewMediaItem = typeof mediaItems.$inferInsert;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type NewMediaFile = typeof mediaFiles.$inferInsert;
export type WatchProgress = typeof watchProgress.$inferSelect;
export type NewWatchProgress = typeof watchProgress.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type ScanJob = typeof scanJobs.$inferSelect;
export type NewScanJob = typeof scanJobs.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
