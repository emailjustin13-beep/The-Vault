import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.select().from(mediaItems).where(
    inArray(mediaItems.status, ["needs_review", "unmatched"])
  ).limit(200);

  return NextResponse.json({ items });
}
