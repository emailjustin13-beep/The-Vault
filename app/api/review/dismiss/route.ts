import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mediaItemId } = await req.json();
  await db.update(mediaItems).set({ status: "unmatched" }).where(eq(mediaItems.id, mediaItemId));

  return NextResponse.json({ success: true });
}
