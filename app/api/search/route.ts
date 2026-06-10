import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { like, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const results = await db.select().from(mediaItems).where(and(eq(mediaItems.status, "matched"), like(mediaItems.title, `%${q}%`))).limit(50);
  return NextResponse.json({ results });
}
