import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const progressSchema = z.object({
  mediaItemId: z.string(),
  position: z.number().min(0),
  duration: z.number().min(0),
  completed: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const { mediaItemId, position, duration, completed } = parsed.data;
  const existing = await db.select().from(watchProgress).where(and(eq(watchProgress.userId, session.user.id), eq(watchProgress.mediaItemId, mediaItemId))).limit(1);
  if (existing.length > 0) {
    await db.update(watchProgress).set({ position, duration, completed, lastWatchedAt: new Date() }).where(and(eq(watchProgress.userId, session.user.id), eq(watchProgress.mediaItemId, mediaItemId)));
  } else {
    await db.insert(watchProgress).values({ id: generateId(), userId: session.user.id, mediaItemId, position, duration, completed });
  }
  return NextResponse.json({ success: true });
}
