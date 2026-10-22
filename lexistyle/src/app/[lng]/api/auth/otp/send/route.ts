import { NextResponse } from "next/server";
import { createOtpChallenge } from "@/lib/auth/otp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string };
    if (!body.phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }
    const result = createOtpChallenge(body.phone);
    return NextResponse.json({
      ok: true,
      phone: result.phone,
      expiresInSec: result.expiresInSec,
      /** mock 모드에서만 노출 — 프로덕션 OTP_MOCK=0 이면 undefined */
      demoCode: result.demoCode,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
