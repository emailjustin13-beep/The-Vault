import { db } from "@/db";
import { mediaItems, mediaFiles, scanJobs, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPutioService } from "./putio";
import { createTMDbService } from "./tmdb";
import { parseFilename, detectMediaType } from "./parser";
import { generateId } from "@/lib/utils";
import { PutioFile } from "@/types";

const CONFIDENCE_THRESHOLD = 90;

export async function startScanJob(userId: string): Promise<string> {
  const jobId = generateId();

  await db.insert(scanJobs).values({
    id: jobId,
    userId,
    status: "queued",
  });

  // Kick off scan async
  runScan(jobId, userId).catch(console.error);

  return jobId;
}

async function runScan(jobId: string, userId: string): Promise<void> {
  try {
    await db
      .update(scanJobs)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(scanJobs.id, jobId));

    const [userSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);

    if (!userSettings?.putioAccessToken) {
      throw new Error("Put.io access token not configured");
    }

    const putio = createPutioService(userSettings.putioAccessToken);
    const tmdb = userSettings.tmdbApiKey
      ? createTMDbService(userSettings.tmdbApiKey)
      : createTMDbService();

    // Fetch all video files from Put.io
    const videoFiles = await putio.getAllVideoFiles();

    await db
      .update(scanJobs)
      .set({ totalFiles: videoFiles.length })
      .where(eq(scanJobs.id, jobId));

    let processed = 0;
    let matched = 0;
    let errors = 0;

    for (const file of videoFiles) {
      try {
        await processFile(file, userId, tmdb);
        matched++;
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        errors++;
      }

      processed++;

      // Update progress every 10 files
      if (processed % 10 === 0) {
        await db
          .update(scanJobs)
          .set({ processedFiles: processed, matchedFiles: matched, errorFiles: errors })
          .where(eq(scanJobs.id, jobId));
      }
    }

    await db
      .update(scanJobs)
      .set({
        status: "completed",
        processedFiles: processed,
        matchedFiles: matched,
        errorFiles: errors,
        completedAt: new Date(),
      })
      .where(eq(scanJobs.id, jobId));
  } catch (err) {
    await db
      .update(scanJobs)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(scanJobs.id, jobId));
  }
}

async function processFile(
  file: PutioFile,
  userId: string,
  tmdb: ReturnType<typeof createTMDbService>
): Promise<void> {
  // Check if already indexed
  const existing = await db
    .select()
    .from(mediaFiles)
    .where(eq(mediaFiles.putioFileId, String(file.id)))
    .limit(1);

  if (existing.length > 0) return;

  const parsed = parseFilename(file.name);
  const mediaType = detectMediaType(file.name, parsed);

  let tmdbId: number | null = null;
  let tmdbData = null;
  let status: "pending" | "matched" | "unmatched" | "needs_review" = "pending";
  let confidence: number | null = null;

  if (tmdb) {
    try {
      const searchFn = mediaType === "movie"
        ? () => tmdb.searchMovie(parsed.title, parsed.year ?? undefined)
        : () => tmdb.searchTV(parsed.title, parsed.year ?? undefined);

      const results = await searchFn();

      if (results.length > 0) {
        const topResult = results[0];
        confidence = tmdb.calculateConfidence(
          { title: parsed.title, year: parsed.year },
          topResult
        );

        if (confidence >= CONFIDENCE_THRESHOLD) {
          tmdbId = topResult.id;
          tmdbData = mediaType === "movie"
            ? await tmdb.getMovieDetails(topResult.id)
            : await tmdb.getTVDetails(topResult.id);
          status = "matched";
        } else if (confidence >= 50) {
          status = "needs_review";
          // Store top candidates for review
          tmdbData = { candidates: results.slice(0, 5).map((r) => ({ ...r, confidence: tmdb.calculateConfidence({ title: parsed.title, year: parsed.year }, r) })) };
        } else {
          status = "unmatched";
        }
      } else {
        status = "unmatched";
      }
    } catch (err) {
      console.error("TMDb lookup failed:", err);
      status = "pending";
    }
  }

  const mediaItemId = generateId();

  await db.insert(mediaItems).values({
    id: mediaItemId,
    putioFileId: String(file.id),
    type: mediaType,
    title: parsed.title,
    year: parsed.year,
    season: parsed.season,
    episode: parsed.episode,
    tmdbId,
    tmdbData,
    status,
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
}
