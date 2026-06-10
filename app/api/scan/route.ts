import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scanJobs, settings, mediaItems, mediaFiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPutioService } from "@/services/putio";
import { createTMDbService } from "@/services/tmdb";
import { parseFilename, detectMediaType } from "@/services/parser";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
  if (!userSettings?.putioAccessToken) return NextResponse.json({ error: "Put.io not configured" }, { status: 400 });

  const jobId = generateId();
  await db.insert(scanJobs).values({ id: jobId, userId: session.user.id, status: "running", startedAt: new Date() });

  try {
    const putio = createPutioService(userSettings.putioAccessToken);
    const tmdb = userSettings.tmdbApiKey ? createTMDbService(userSettings.tmdbApiKey) : createTMDbService();

    const videoFiles = await putio.getAllVideoFiles();
    let matched = 0;
    let errors = 0;

    for (const file of videoFiles) {
      try {
        const existing = await db.select().from(mediaFiles).where(eq(mediaFiles.putioFileId, String(file.id))).limit(1);
        if (existing.length > 0) continue;

        const parsed = parseFilename(file.name);
        const mediaType = detectMediaType(file.name, parsed);

        let tmdbId = null;
        let tmdbData = null;
        let status = "pending";
        let confidence = null;

        if (tmdb) {
          const results = mediaType === "movie"
            ? await tmdb.searchMovie(parsed.title, parsed.year ?? undefined)
            : await tmdb.searchTV(parsed.title, parsed.year ?? undefined);

          if (results.length > 0) {
            confidence = tmdb.calculateConfidence({ title: parsed.title, year: parsed.year }, results[0]);
            if (confidence >= 90) {
              tmdbId = results[0].id;
              tmdbData = mediaType === "movie" ? await tmdb.getMovieDetails(results[0].id) : await tmdb.getTVDetails(results[0].id);
              status = "matched";
            } else {
              status = confidence >= 50 ? "needs_review" : "unmatched";
            }
          } else {
            status = "unmatched";
          }
        }

        const mediaItemId = generateId();
await db.insert(mediaItems).values({ id: mediaItemId, putioFileId: String(file.id), type: mediaType, title: parsed.title, year: parsed.year, season: parsed.season, episode: parsed.episode, tmdbId, tmdbData, status: status as "pending" | "matched" | "unmatched" | "needs_review", confidence, lastScannedAt: new Date() });        await db.insert(mediaFiles).values({ id: generateId(), mediaItemId, putioFileId: String(file.id), filename: file.name, size: file.size, resolution: parsed.resolution, codec: parsed.codec, source: parsed.source, hasSubtitles: false });
        matched++;
      } catch {
        errors++;
      }
    }

    await db.update(scanJobs).set({ status: "completed", totalFiles: videoFiles.length, processedFiles: videoFiles.length, matchedFiles: matched, errorFiles: errors, completedAt: new Date() }).where(eq(scanJobs.id, jobId));
    return NextResponse.json({ jobId, matched, total: videoFiles.length });
  } catch (error) {
    await db.update(scanJobs).set({ status: "failed", error: error instanceof Error ? error.message : "Unknown error", completedAt: new Date() }).where(eq(scanJobs.id, jobId));
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
