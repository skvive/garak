import { NextResponse } from "next/server";
import { studioDashboard } from "@/lib/studio/store";
import { cafe24StatusPayload } from "@/lib/cafe24/config";
import { cafe24Connected } from "@/lib/cafe24/oauth";
import { studioActor, unauthorized } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await studioActor())) return unauthorized();
  const [studio, connected] = await Promise.all([studioDashboard(), cafe24Connected()]);
  return NextResponse.json({
    studio,
    cafe24: { ...cafe24StatusPayload(), connected },
    commerceOwner: "cafe24",
    studioOwner: "lexi",
  });
}
