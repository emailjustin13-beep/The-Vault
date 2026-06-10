import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, session.user.id)).limit(1);
  if (!userSettings?.putioAccessToken) return NextResponse.json({ error: "Put.io not configured" }, { status: 400 });

  const token = userSettings.putioAccessToken;

  // Use Put.io's HLS stream which transcodes to browser-compatible format
  const streamUrl = `https://api.put.io/v2/files/${fileId}/hls/media.m3u8?oauth_token=${token}&subtitle_key=all`;
  return NextResponse.redirect(streamUrl);
}
