import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTMDbService } from "@/services/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  const type = req.nextUrl.searchParams.get("type") || "movie";
  if (!q) return NextResponse.json({ results: [] });

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
  const tmdb = createTMDbService(userSettings?.tmdbApiKey || undefined);
  if (!tmdb) return NextResponse.json({ results: [] });

  const results = type === "movie"
    ? await tmdb.searchMovie(q)
    : await tmdb.searchTV(q);

  return NextResponse.json({ results });
}
