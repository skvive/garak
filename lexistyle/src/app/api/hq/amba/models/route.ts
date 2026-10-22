// /app/api/hq/amba/models/route.ts — AMBA 모델 목록 API

import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { listAmbaModels, getModelStats } from "@/lib/pdp/amba-models";

/** GET: 모든 AMBA 모델 목록 반환 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const models = listAmbaModels();
    const stats = getModelStats(models);

    return NextResponse.json({
      success: true,
      data: {
        registry: {
          sourceRepo: "https://github.com/shinkangteam/ambassador-ai-site",
          agency: "AMBA",
          agencyFull: "AI Ambassador",
          generatedAt: new Date().toISOString(),
          count: models.length,
        },
        models,
        stats,
      },
    });
  } catch (err) {
    console.error("[API /hq/amba/models] Error:", err);
    return NextResponse.json(
      { success: false, error: "AMBA 모델 로드 실패" },
      { status: 500 }
    );
  }
}