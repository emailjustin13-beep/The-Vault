import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTMDbService } from "@/services/tmdb";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { apiKey } = await req.json();
  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });
  const service = createTMDbService(apiKey);
  const valid = service ? await service.verifyKey() : false;
  return valid ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Invalid API key" }, { status: 400 });
}
