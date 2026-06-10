import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startScanJob } from "@/services/scanner";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const jobId = await startScanJob(session.user.id);
    return NextResponse.json({ jobId, status: "queued" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan failed" }, { status: 500 });
  }
}
