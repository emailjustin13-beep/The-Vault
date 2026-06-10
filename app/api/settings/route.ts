import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const settingsSchema = z.object({
  putioAccessToken: z.string().optional(),
  tmdbApiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const existing = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
  if (existing.length > 0) {
    await db.update(settings).set({ ...parsed.data, updatedAt: new Date() }).where(eq(settings.userId, session.user.id));
  } else {
    await db.insert(settings).values({ id: generateId(), userId: session.user.id, ...parsed.data });
  }
  return NextResponse.json({ success: true });
}
