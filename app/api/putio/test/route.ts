import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPutioService } from "@/services/putio";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accessToken } = await req.json();
  if (!accessToken) return NextResponse.json({ error: "Token required" }, { status: 400 });
  const service = createPutioService(accessToken);
  const valid = await service.verifyToken();
  return valid ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Invalid token" }, { status: 400 });
}
