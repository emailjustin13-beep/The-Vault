import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scanJobs, settings, mediaItems, mediaFiles } from "@/db/schema";
import { eq, and, ilike, isNull, sql } from "drizzle-orm";
import { createPutioService } from "@/services/putio";
import { createTMDbService } from "@/services/tmdb";
import { parseFilename, detectMediaType } from "@/services/parser";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*/g, " ")
    .replace(/[()[\]]/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const offset = body.offset || 0;
  const BATCH_SIZE = 50;

  const [userSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.user.id))
    .limit(1);
  if (!userSettings?.putioAccessToken)
    return NextResponse.json({ error: "Put.io not configured" }, { status: 400 });

  const jobId = generateId();
  await db.insert(scanJobs).values({
    id: jobId,
    userId: session.user.id,
    status: "running",
    startedAt: new Date(),
  });

  try {
    const putio = createPutioService(userSettings.putioAccessToken);
    const tmdb = userSettings.tmdbApiKey
      ? createTMDbService(userSettings.tmdbApiKey)
      : createTMDbService();

    const allVideoFiles = await putio.getAllVideoFiles();
    const totalFiles = allVideoFiles.length;
    const batch = allVideoFiles.slice(offset, offset + BATCH_SIZE);
    const hasMore = offset + BATCH_SIZE < totalFiles;

    if (offset === 0) {
      // ── 1. Remove deleted Put.io files ──────────────────────────────
      const allPutioIds = allVideoFiles.map((f) => String(f.id));
      const allDbFiles = await db
        .select({
          id: mediaFiles.id,
          mediaItemId: mediaFiles.mediaItemId,
          putioFileId: mediaFiles.putioFileId,
        })
        .from(mediaFiles);

      const deletedFiles = allDbFiles.filter(
        (f) =>
          !allPutioIds.includes(f.putioFileId) &&
          !f.putioFileId.startsWith("fix_")
      );

      for (const file of deletedFiles) {
        await db.delete(mediaFiles).where(eq(mediaFiles.id, file.id));
        const remaining = await db
          .select()
          .from(mediaFiles)
          .where(eq(mediaFiles.mediaItemId, file.mediaItemId))
          .limit(1);
        if (remaining.length === 0) {
          await db.delete(mediaItems).where(eq(mediaItems.id, file.mediaItemId));
        }
      }

      // ── 2. Auto-repair orphan movies ────────────────────────────────
      // Find media_items of type movie with no media_files
      const allMovieItems = await db
        .select({ id: mediaItems.id, putioFileId: mediaItems.putioFileId })
        .from(mediaItems)
        .where(eq(mediaItems.type, "movie"));

      for (const movieItem of allMovieItems) {
        const existingFiles = await db
          .select()
          .from(mediaFiles)
          .where(eq(mediaFiles.mediaItemId, movieItem.id))
          .limit(1);

        if (existingFiles.length === 0) {
          // Derive the real Put.io file ID by stripping movie_ prefix
          const realPutioId = movieItem.putioFileId.startsWith("movie_")
            ? movieItem.putioFileId.replace("movie_", "")
            : movieItem.putioFileId;

          // Only create the file record if the Put.io file still exists
          if (allPutioIds.includes(realPutioId)) {
            const putioFile = allVideoFiles.find(
              (f) => String(f.id) === realPutioId
            );
            if (putioFile) {
              const parsed = parseFilename(putioFile.name);
              await db
                .insert(mediaFiles)
                .values({
                  id: generateId(),
                  mediaItemId: movieItem.id,
                  putioFileId: realPutioId,
                  filename: putioFile.name,
                  size: putioFile.size,
                  resolution: parsed.resolution,
                  codec: parsed.codec,
                  source: parsed.source,
                  hasSubtitles: false,
                })
                .onConflictDoNothing();
            }
          } else {
            // File no longer exists on Put.io — delete the orphan item
            await db.delete(mediaItems).where(eq(mediaItems.id, movieItem.id));
          }
        }
      }

      // ── 3. Auto-repair orphan TV shows ──────────────────────────────
      const allTVItems = await db
        .select({ id: mediaItems.id, title: mediaItems.title, type: mediaItems.type, putioFileId: mediaItems.putioFileId })
        .from(mediaItems)
        .where(
          sql`${mediaItems.type} IN ('tv', 'anime')`
        );

      for (const tvItem of allTVItems) {
        const existingFiles = await db
          .select()
          .from(mediaFiles)
          .where(eq(mediaFiles.mediaItemId, tvItem.id))
          .limit(1);

        if (existingFiles.length === 0) {
          // Find all Put.io files that belong to this show by title match
          const showFiles = allVideoFiles.filter((f) => {
            const parsed = parseFilename(f.name);
            const mediaType = detectMediaType(f.name, parsed);
            if (mediaType !== tvItem.type) return false;
            let title = parsed.title;
            if (!title || title.match(/^s\d+e\d+/i) || title.trim().length < 2) {
              title = cleanTitle(f.folderName || title);
            }
            return cleanTitle(title).toLowerCase() === cleanTitle(tvItem.title).toLowerCase();
          });

          if (showFiles.length > 0) {
            for (const file of showFiles) {
              const epParsed = parseFilename(file.name);
              await db
                .insert(mediaFiles)
                .values({
                  id: generateId(),
                  mediaItemId: tvItem.id,
                  putioFileId: String(file.id),
                  filename: file.name,
                  size: file.size,
                  resolution: epParsed.resolution,
                  codec: epParsed.codec,
                  source: epParsed.source,
                  hasSubtitles: false,
                })
                .onConflictDoNothing();
            }
          } else {
            // No matching files found — delete the orphan item
            await db.delete(mediaItems).where(eq(mediaItems.id, tvItem.id));
          }
        }
      }

      // ── 4. Remove duplicate media_items (same title + type) ─────────
      const allItems = await db
        .select({ id: mediaItems.id, title: mediaItems.title, type: mediaItems.type, addedAt: mediaItems.addedAt })
        .from(mediaItems);

      const seen = new Map<string, { id: string; addedAt: Date }>();
      const duplicatesToDelete: string[] = [];

      for (const item of allItems) {
        const key = `${item.type}::${cleanTitle(item.title).toLowerCase()}`;
        if (seen.has(key)) {
          // Keep the oldest, delete the newer duplicate
          const existing = seen.get(key)!;
          if (item.addedAt > existing.addedAt) {
            duplicatesToDelete.push(item.id);
          } else {
            duplicatesToDelete.push(existing.id);
            seen.set(key, { id: item.id, addedAt: item.addedAt });
          }
        } else {
          seen.set(key, { id: item.id, addedAt: item.addedAt });
        }
      }

      for (const dupId of duplicatesToDelete) {
        // Reassign any files from the duplicate to the keeper before deleting
        const keeper = seen.get(
          [...seen.entries()].find(([, v]) => v.id !== dupId)?.[0] || ""
        );
        // Just delete the duplicate item — files will cascade or were already on keeper
        await db.delete(mediaItems).where(eq(mediaItems.id, dupId));
      }
    }

    // ── Process batch ────────────────────────────────────────────────
    const showMap = new Map<string, typeof batch>();
    const movieFiles: typeof batch = [];

    for (const file of batch) {
      let parsed = parseFilename(file.name);
      const mediaType = detectMediaType(file.name, parsed);

      if (mediaType === "tv" || mediaType === "anime") {
        if (
          !parsed.title ||
          parsed.title.match(/^s\d+e\d+/i) ||
          parsed.title.trim().length < 2
        ) {
          parsed.title = cleanTitle(file.folderName || parsed.title);
        }
        const key = cleanTitle(parsed.title).toLowerCase();
        if (!showMap.has(key)) showMap.set(key, []);
        showMap.get(key)!.push(file);
      } else {
        movieFiles.push(file);
      }
    }

    let matched = 0;
    let errors = 0;

    // Process movies
    for (const file of movieFiles) {
      try {
        const existing = await db
          .select()
          .from(mediaFiles)
          .where(eq(mediaFiles.putioFileId, String(file.id)))
          .limit(1);
        if (existing.length > 0) continue;

        const parsed = parseFilename(file.name);
        const searchTitle = cleanTitle(parsed.title);

        let tmdbId = null;
        let tmdbData = null;
        let status = "pending";
        let confidence = null;

        if (tmdb) {
          const results = await tmdb.searchMovie(
            searchTitle,
            parsed.year ?? undefined
          );
          if (results.length > 0) {
            confidence = tmdb.calculateConfidence(
              { title: searchTitle, year: parsed.year },
              results[0]
            );
            if (confidence >= 60) {
              tmdbId = results[0].id;
              tmdbData = await tmdb.getMovieDetails(results[0].id);
              status = "matched";
            } else {
              status = confidence >= 40 ? "needs_review" : "unmatched";
            }
          } else {
            status = "unmatched";
          }
        }

        const existingItem = await db
          .select()
          .from(mediaItems)
          .where(eq(mediaItems.putioFileId, `movie_${String(file.id)}`))
          .limit(1);

        let mediaItemId: string;
        if (existingItem.length > 0) {
          mediaItemId = existingItem[0].id;
        } else {
          mediaItemId = generateId();
          await db.insert(mediaItems).values({
            id: mediaItemId,
            putioFileId: `movie_${String(file.id)}`,
            type: "movie",
            title: searchTitle,
            year: parsed.year,
            season: null,
            episode: null,
            tmdbId,
            tmdbData,
            status: status as "pending" | "matched" | "unmatched" | "needs_review",
            confidence,
            lastScannedAt: new Date(),
          });
        }

        await db
          .insert(mediaFiles)
          .values({
            id: generateId(),
            mediaItemId,
            putioFileId: String(file.id),
            filename: file.name,
            size: file.size,
            resolution: parsed.resolution,
            codec: parsed.codec,
            source: parsed.source,
            hasSubtitles: false,
          })
          .onConflictDoNothing();

        matched++;
      } catch {
        errors++;
      }
    }

    // Process TV shows
    for (const [, episodes] of showMap) {
      try {
        const firstFile = episodes[0];
        let parsed = parseFilename(firstFile.name);
        const mediaType = detectMediaType(firstFile.name, parsed);

        if (
          !parsed.title ||
          parsed.title.match(/^s\d+e\d+/i) ||
          parsed.title.trim().length < 2
        ) {
          parsed.title = cleanTitle(firstFile.folderName || parsed.title);
        }

        const searchTitle = cleanTitle(parsed.title);

        const existing = await db
          .select()
          .from(mediaItems)
          .where(
            and(
              ilike(mediaItems.title, searchTitle),
              eq(mediaItems.type, mediaType)
            )
          )
          .limit(1);

        let mediaItemId: string;

        if (existing.length > 0) {
          mediaItemId = existing[0].id;
        } else {
          let tmdbId = null;
          let tmdbData = null;
          let status = "pending";
          let confidence = null;

          if (tmdb) {
            const results = await tmdb.searchTV(searchTitle);
            if (results.length > 0) {
              confidence = tmdb.calculateConfidence(
                { title: searchTitle, year: null },
                results[0]
              );
              if (confidence >= 60) {
                tmdbId = results[0].id;
                tmdbData = await tmdb.getTVDetails(results[0].id);
                status = "matched";
              } else {
                status = confidence >= 40 ? "needs_review" : "unmatched";
              }
            } else {
              status = "unmatched";
            }
          }

          mediaItemId = generateId();
          await db.insert(mediaItems).values({
            id: mediaItemId,
            putioFileId: String(firstFile.id),
            type: mediaType,
            title: searchTitle,
            year: parsed.year,
            season: null,
            episode: null,
            tmdbId,
            tmdbData,
            status: status as "pending" | "matched" | "unmatched" | "needs_review",
            confidence,
            lastScannedAt: new Date(),
          });
        }

        for (const file of episodes) {
          const epExisting = await db
            .select()
            .from(mediaFiles)
            .where(eq(mediaFiles.putioFileId, String(file.id)))
            .limit(1);
          if (epExisting.length > 0) continue;

          const epParsed = parseFilename(file.name);
          await db
            .insert(mediaFiles)
            .values({
              id: generateId(),
              mediaItemId,
              putioFileId: String(file.id),
              filename: file.name,
              size: file.size,
              resolution: epParsed.resolution,
              codec: epParsed.codec,
              source: epParsed.source,
              hasSubtitles: false,
            })
            .onConflictDoNothing();
        }

        matched++;
      } catch {
        errors++;
      }
    }

    await db
      .update(scanJobs)
      .set({
        status: "completed",
        totalFiles,
        processedFiles: offset + batch.length,
        matchedFiles: matched,
        errorFiles: errors,
        completedAt: new Date(),
      })
      .where(eq(scanJobs.id, jobId));

    return NextResponse.json({
      jobId,
      matched,
      processed: offset + batch.length,
      total: totalFiles,
      hasMore,
      nextOffset: offset + BATCH_SIZE,
    });
  } catch (error) {
    await db
      .update(scanJobs)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(scanJobs.id, jobId));
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
