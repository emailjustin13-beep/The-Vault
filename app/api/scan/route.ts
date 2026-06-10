import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scanJobs, settings, mediaItems, mediaFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createPutioService } from "@/services/putio";
import { createTMDbService } from "@/services/tmdb";
import { parseFilename, detectMediaType } from "@/services/parser";
import { NextRequest } from "next/server";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const offset = body.offset || 0;
  const BATCH_SIZE = 50;

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
  if (!userSettings?.putioAccessToken) return NextResponse.json({ error: "Put.io not configured" }, { status: 400 });

  const jobId = generateId();
  await db.insert(scanJobs).values({ id: jobId, userId: session.user.id, status: "running", startedAt: new Date() });

  try {
    const putio = createPutioService(userSettings.putioAccessToken);
    const tmdb = userSettings.tmdbApiKey ? createTMDbService(userSettings.tmdbApiKey) : createTMDbService();

    const allVideoFiles = await putio.getAllVideoFiles();
    const totalFiles = allVideoFiles.length;
    const batch = allVideoFiles.slice(offset, offset + BATCH_SIZE);
    const hasMore = offset + BATCH_SIZE < totalFiles;

    // Group TV episodes by show title within this batch
    const showMap = new Map<string, typeof batch>();
    const movieFiles = [];

    for (const file of batch) {
      const parsed = parseFilename(file.name);
      const mediaType = detectMediaType(file.name, parsed);

      if (mediaType === "tv" || mediaType === "anime") {
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
        const existing = await db.select().from(mediaFiles).where(eq(mediaFiles.putioFileId, String(file.id))).limit(1);
        if (existing.length > 0) continue;

        const parsed = parseFilename(file.name);
        const searchTitle = cleanTitle(parsed.title);

        let tmdbId = null;
        let tmdbData = null;
        let status = "pending";
        let confidence = null;

        if (tmdb) {
          const results = await tmdb.searchMovie(searchTitle, parsed.year ?? undefined);
          if (results.length > 0) {
            confidence = tmdb.calculateConfidence({ title: searchTitle, year: parsed.year }, results[0]);
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

        const mediaItemId = generateId();
        await db.insert(mediaItems).values({
          id: mediaItemId,
          putioFileId: String(file.id),
          type: "movie",
          title: parsed.title,
          year: parsed.year,
          season: null,
          episode: null,
          tmdbId,
          tmdbData,
          status: status as "pending" | "matched" | "unmatched" | "needs_review",
          confidence,
          lastScannedAt: new Date(),
        });
        await db.insert(mediaFiles).values({
          id: generateId(),
          mediaItemId,
          putioFileId: String(file.id),
          filename: file.name,
          size: file.size,
          resolution: parsed.resolution,
          codec: parsed.codec,
          source: parsed.source,
          hasSubtitles: false,
        });
        matched++;
      } catch {
        errors++;
      }
    }

    // Process TV shows
    for (const [, episodes] of showMap) {
      try {
        const firstFile = episodes[0];
        const parsed = parseFilename(firstFile.name);
        const mediaType = detectMediaType(firstFile.name, parsed);
        const searchTitle = cleanTitle(parsed.title);

        const existing = await db.select().from(mediaItems)
          .where(and(eq(mediaItems.title, parsed.title), eq(mediaItems.type, mediaType)))
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
            const results = await tmdb.searchTV(searchTitle, parsed.year ?? undefined);
            if (results.length > 0) {
              confidence = tmdb.calculateConfidence({ title: searchTitle, year: parsed.year }, results[0]);
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
            title: parsed.title,
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
          const epExisting = await db.select().from(mediaFiles).where(eq(mediaFiles.putioFileId, String(file.id))).limit(1);
          if (epExisting.length > 0) continue;

          const epParsed = parseFilename(file.name);
          await db.insert(mediaFiles).values({
            id: generateId(),
            mediaItemId,
            putioFileId: String(file.id),
            filename: file.name,
            size: file.size,
            resolution: epParsed.resolution,
            codec: epParsed.codec,
            source: epParsed.source,
            hasSubtitles: false,
          });
        }

        matched++;
      } catch {
        errors++;
      }
    }

    await db.update(scanJobs).set({
      status: "completed",
      totalFiles,
      processedFiles: offset + batch.length,
      matchedFiles: matched,
      errorFiles: errors,
      completedAt: new Date(),
    }).where(eq(scanJobs.id, jobId));

    return NextResponse.json({
      jobId,
      matched,
      processed: offset + batch.length,
      total: totalFiles,
      hasMore,
      nextOffset: offset + BATCH_SIZE,
    });

  } catch (error) {
    await db.update(scanJobs).set({
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
    }).where(eq(scanJobs.id, jobId));
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
