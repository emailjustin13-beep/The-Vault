import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTMDbService } from "@/services/tmdb";
import { z } from "zod";

const schema = z.object({
  mediaItemId: z.string(),
  tmdbId: z.number(),
  mediaType: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { mediaItemId, tmdbId, mediaType } = parsed.data;

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
  const tmdb = createTMDbService(userSettings?.tmdbApiKey || undefined);
  if (!tmdb) return NextResponse.json({ error: "TMDb not configured" }, { status: 400 });

  const tmdbData = mediaType === "movie"
    ? await tmdb.getMovieDetails(tmdbId)
    : await tmdb.getTVDetails(tmdbId);

  await db.update(mediaItems)
    .set({ tmdbId, tmdbData, status: "matched", confidence: 100 })
    .where(eq(mediaItems.id, mediaItemId));

  return NextResponse.json({ success: true });
}
