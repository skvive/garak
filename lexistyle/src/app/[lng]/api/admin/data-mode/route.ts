import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDataMode, switchDataMode, type Strategy } from "@/lib/data-mode";
import { hqActor, unauthorized } from "@/lib/hq/auth";

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  return NextResponse.json(await getDataMode());
}

export async function POST(req: Request) {
  // 데이터 모드 전환은 파괴적 작업 — 관리자만
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const body = (await req.json()) as {
    target?: "dummy" | "real";
    strategy?: Strategy;
    confirm?: string;
  };

  if (body.target !== "dummy" && body.target !== "real") {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  // Real 전환은 파괴적 작업 — 브랜드명 타이핑 확인 필수 (spec §4.3)
  if (body.target === "real" && body.confirm !== "LEXI") {
    return NextResponse.json({ error: "confirmation phrase mismatch" }, { status: 400 });
  }

  const current = await getDataMode();
  // Real 초기화 완료 후 더미 복귀는 감사 대상 — 시더 재실행 가드 (spec §4.3)
  if (current.initialized && body.target === "dummy") {
    return NextResponse.json(
      { error: "initialized site cannot silently return to dummy; reseed via audit path" },
      { status: 409 },
    );
  }

  const result = await switchDataMode(body.target, body.strategy ?? "soft", actor);
  revalidatePath("/", "layout");
  return NextResponse.json(result);
}
