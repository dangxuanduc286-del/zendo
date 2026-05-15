import { NextResponse } from "next/server";
import { handleAffiliateTrackPost } from "@/lib/affiliate-ingest-pipeline";

export async function POST(request: Request): Promise<NextResponse> {
  return handleAffiliateTrackPost(request);
}
