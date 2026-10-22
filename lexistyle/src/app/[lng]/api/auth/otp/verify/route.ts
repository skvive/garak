import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; code?: string };
    if (!body.phone || !body.code) {
      return NextResponse.json({ error: "phone and code required" }, { status: 400 });
    }
    const { phone, email } = verifyOtp(body.phone, body.code);
    const token = await createSessionToken(
      { email, name: `LEXI ${phone.slice(-4)}` },
      60 * 60 * 24 * 7,
    );
    const res = NextResponse.json({ ok: true, redirectUrl: "/account" });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
