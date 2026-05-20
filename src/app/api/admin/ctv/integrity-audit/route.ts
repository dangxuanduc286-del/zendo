import { NextResponse } from "next/server";
import {
  auditCtvProfileIntegrity,
  auditCtvSystemSample,
} from "@/lib/ctv/ctv-data-integrity";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = (searchParams.get("affiliateProfileId") ?? "").trim();
    const sample = Math.min(Number(searchParams.get("sample") ?? 50), 200);

    if (profileId) {
      const report = await auditCtvProfileIntegrity(profileId);
      return NextResponse.json({ ok: true, report });
    }

    const system = await auditCtvSystemSample(sample);
    return NextResponse.json({ ok: true, system });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
